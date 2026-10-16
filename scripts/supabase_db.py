"""Database setup CLI. Credentials stay in ignored .env.supabase.local.

Install psycopg[binary] into .local-test/db-tools before running this script.
Commands: inspect (read-only), migrate (transactional, checksummed migrations).
Download Supabase's public CA to .local-test/supabase-root-ca.crt first.
"""
import argparse
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.local-test/db-tools'))
import psycopg  # noqa: E402

MIGRATIONS = [
    'schema.sql', 'order-points.sql', 'product-images.sql', 'product-categories.sql',
    'product-delete.sql', 'product-variants.sql', 'product-options.sql',
    'customer-management.sql', 'order-points-edit.sql', 'gift-redemptions.sql',
    'notification-reads.sql', 'production-write-lockdown.sql',
    'customer-shipping-address.sql',
    'customer-avatars.sql',
    'gift-customer-service.sql', 'contact-messages.sql',
]

def config():
    values = {}
    for line in (ROOT / '.env.supabase.local').read_text(encoding='utf-8-sig').splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value
    return values

def connect():
    values = config()
    # libpq on Windows cannot reliably open CJK certificate paths.
    cert = (ROOT / '.local-test/supabase-root-ca.crt').read_bytes()
    ca_path = Path(tempfile.gettempdir()) / ('bags-star-ca-' + hashlib.sha256(cert).hexdigest()[:16] + '.crt')
    ca_path.write_bytes(cert)
    return psycopg.connect(
        host=values['PGHOST'], port=int(values['PGPORT']), dbname=values['PGDATABASE'],
        user=values['PGUSER'], password=values['PGPASSWORD'], sslmode='verify-full',
        sslrootcert=str(ca_path), connect_timeout=15, application_name='bags-star-setup',
        options='-c statement_timeout=30000 -c lock_timeout=5000',
    )

def inspect(conn):
    conn.execute('set transaction read only')
    return {
        'connected': True, 'certificate_and_hostname_verified': True,
        'public_tables': conn.execute("select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename").fetchall(),
        'auth_user_count': conn.execute('select count(*) from auth.users').fetchone()[0],
        'storage_buckets': conn.execute('select id,public from storage.buckets order by id').fetchall(),
    }

def migrate(conn):
    conn.execute("select pg_advisory_xact_lock(hashtextextended('bags-star-migrations',0))")
    conn.execute('create schema if not exists bags_star_migrations')
    conn.execute('revoke all on schema bags_star_migrations from public,anon,authenticated')
    conn.execute('create table if not exists bags_star_migrations.applied (name text primary key, checksum text not null, applied_at timestamptz not null default now())')
    applied = []
    for name in MIGRATIONS:
        contents = (ROOT / 'supabase' / name).read_text(encoding='utf-8-sig')
        checksum = hashlib.sha256(contents.encode('utf-8')).hexdigest()
        old = conn.execute('select checksum from bags_star_migrations.applied where name=%s', (name,)).fetchone()
        if old:
            if old[0] != checksum:
                raise RuntimeError('Previously applied migration changed: ' + name)
            continue
        # These reviewed SQL files contain only top-level BEGIN;/COMMIT; on their own lines.
        # Remove wrappers so the entire batch, including its history, commits once.
        contents = re.sub(r'^(?:begin|commit);\s*$', '', contents, flags=re.MULTILINE | re.IGNORECASE)
        conn.execute(contents, prepare=False)
        conn.execute('insert into bags_star_migrations.applied(name,checksum) values(%s,%s)', (name, checksum))
        applied.append(name)
    conn.execute("notify pgrst, 'reload schema'")
    return {'migrations_applied': applied}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['inspect', 'migrate'])
    args = parser.parse_args()
    try:
        with connect() as connection:
            result = inspect(connection) if args.command == 'inspect' else migrate(connection)
        print(json.dumps(result))
    except Exception as exc:
        # Never log DSNs or passwords, including on connection failures.
        secret = config().get('PGPASSWORD', '')
        print(json.dumps({'error': str(exc).replace(secret, '[REDACTED]') if secret else str(exc)}))
        raise SystemExit(1)
