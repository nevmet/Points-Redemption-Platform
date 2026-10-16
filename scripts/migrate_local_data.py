"""One-time, resumable local-to-Supabase import. Secrets and backups stay ignored.

Run plan first; apply requires the approved admin email and a service key in
.env.supabase.local. Business rows commit together; Auth/Storage are retryable.
Never resets an existing password or overwrites existing business data.
"""
import argparse
import copy
import hashlib
import json
import shutil
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from supabase_db import ROOT, config, connect
from psycopg import sql
from psycopg.types.json import Jsonb

SOURCE = ROOT / '.local-test/data.json'
TABLES = {'products': 'products', 'orders': 'order_point_requests',
          'redemptions': 'redemption_requests', 'transactions': 'point_transactions'}
JSON_COLUMNS = {'variants', 'options', 'selected_options', 'status_history'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def source_data():
    raw = SOURCE.read_bytes()
    return json.loads(raw.decode('utf-8-sig')), digest(raw)


def image_files(data):
    found = {}
    for product in data['products']:
        for url in set(product.get('image_urls', []) + [product.get('image_url')]):
            if not url:
                continue
            if not url.startswith('/images/'):
                raise RuntimeError('Unexpected image source; review before importing')
            path = (ROOT / 'public' / url.lstrip('/')).resolve()
            if not path.is_relative_to((ROOT / 'public/images').resolve()) or not path.is_file():
                raise RuntimeError('Missing or out-of-scope product image')
            found[url] = path
    return found


def source_balances(data):
    balances = {}
    for row in data['transactions']:
        owner = row['customer_id']
        balances[owner] = balances.get(owner, 0) + row['points'] * (1 if row['type'] == 'credit' else -1)
    return balances


def plan(data):
    return {'counts': {k: len(data[k]) for k in TABLES},
            'categories': len(data['categories']), 'images': len(image_files(data)),
            'variants': sum(len(p.get('variants', [])) for p in data['products']),
            'balances': source_balances(data)}


def api(path, method='GET', body=None, content_type='application/json', public=False):
    env = config()
    key = env['SUPABASE_PUBLISHABLE_KEY'] if public else env['SUPABASE_SECRET_KEY']
    payload = body if isinstance(body, bytes) else json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(env['SUPABASE_PROJECT_URL'] + path, data=payload, method=method,
                                 headers={'apikey': key, 'Authorization': 'Bearer ' + key,
                                          'Content-Type': content_type})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = response.read()
            return json.loads(result) if 'json' in response.headers.get('Content-Type', '') else result
    except urllib.error.HTTPError as error:
        # Responses could contain PII; do not print their bodies or request credentials.
        raise RuntimeError(f'Supabase {method} {path.split("?")[0]} failed: HTTP {error.code}') from None


def ensure_accounts(data, admin_email):
    if data.get('customers'):
        raise RuntimeError('Additional local customers need an explicit credential migration plan')
    with connect() as conn:
        admin = conn.execute("select id,raw_user_meta_data,email_confirmed_at from auth.users where lower(email)=lower(%s) and raw_app_meta_data->>'role'='admin'", (admin_email,)).fetchone()
        if not admin or not admin[2]:
            raise RuntimeError('The approved confirmed cloud administrator was not found')
        customer = conn.execute("select id,raw_app_meta_data from auth.users where lower(email)='user01@example.test'").fetchone()
        if customer and customer[1].get('local_migration_id') != 'test-customer-01':
            raise RuntimeError('Customer email already belongs to an unrelated cloud account')
    if not customer:
        password = config().get('MIGRATION_USER01_PASSWORD', '')
        if not password:
            raise RuntimeError('Set the original test customer password in ignored migration configuration')
        stored = data.get('credentials', {}).get('test-customer-01')
        salt = stored['salt'] if stored else 'bags-star-local-test-v1'
        expected = stored['digest'] if stored else 'd8bd8288cd075a805f818123e3d98c1315af8ef680c3af254243a61880b4d10d2825e5ac368fd623a11b295b00c8d74c45cab2907d489de8739d7ff88c3fbebf'
        if hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64).hex() != expected:
            raise RuntimeError('Provided customer password does not match the original local account')
        result = api('/auth/v1/admin/users', 'POST', {
            'email': 'user01@example.test', 'password': password, 'email_confirm': True,
            'user_metadata': {'name': 'user01', **data.get('profiles', {}).get('test-customer-01', {})},
            'app_metadata': {'role': 'customer', 'local_migration_id': 'test-customer-01'},
        })
        customer_id = result['id']
    else:
        customer_id = str(customer[0])
    profile = data.get('profiles', {}).get('test-admin', {})
    api('/auth/v1/admin/users/' + str(admin[0]), 'PUT', {
        'user_metadata': {**(admin[1] or {}), 'name': (admin[1] or {}).get('name') or 'admin', **profile},
    })
    return {'test-admin': str(admin[0]), 'test-customer-01': customer_id}


def upload_images(data):
    urls = {}
    for source_url, path in image_files(data).items():
        content = path.read_bytes()
        object_name = 'migration/' + digest(content) + path.suffix.lower()
        endpoint = '/storage/v1/object/product-images/' + object_name
        public_endpoint = '/storage/v1/object/public/product-images/' + object_name
        try:
            existing = api(public_endpoint, public=True)
        except RuntimeError as error:
            if not any(f'HTTP {status}' in str(error) for status in (400, 404)):
                raise
            mime = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}.get(path.suffix.lower())
            if not mime:
                raise RuntimeError('Unsupported product image format')
            api(endpoint, 'POST', content, mime)
            existing = api(public_endpoint, public=True)
        if not isinstance(existing, bytes) or digest(existing) != digest(content):
            raise RuntimeError('Uploaded product image checksum mismatch')
        urls[source_url] = config()['SUPABASE_PROJECT_URL'] + public_endpoint
    return urls


def transformed(data, users, images):
    result = copy.deepcopy(data)
    for product in result['products']:
        product['image_urls'] = [images[url] for url in product.get('image_urls', [])]
        product['image_url'] = images.get(product.get('image_url'))
    for order in result['orders']:
        order['customer_id'] = users[order['customer_id']]
        order['reviewed_by'] = users.get(order.get('reviewed_by'))
    for gift in result['redemptions']:
        if gift['customer_email'] != 'user01@example.test':
            raise RuntimeError('Unmapped gift owner')
        gift['customer_id'] = users['test-customer-01']
        for event in gift.get('status_history', []):
            event['by'] = users[event['by']]
    for transaction in result['transactions']:
        old_owner = transaction['customer_id']
        transaction['customer_id'] = users[old_owner]
        transaction['created_by'] = users.get(transaction.get('created_by'))
        if transaction.get('refund_redemption_id'):
            transaction['created_by'] = transaction['created_by'] or users['test-admin']
        elif transaction['type'] == 'debit':
            candidates = [g for g in result['redemptions'] if
                          g['customer_id'] == transaction['customer_id'] and g['points'] == transaction['points'] and
                          abs((datetime.fromisoformat(g['created_at'].replace('Z','+00:00')) -
                               datetime.fromisoformat(transaction['created_at'].replace('Z','+00:00'))).total_seconds()) < 0.01]
            if len(candidates) != 1:
                raise RuntimeError('Cannot unambiguously link historical gift debit')
            transaction['redemption_request_id'] = candidates[0]['id']
            transaction['created_by'] = transaction['created_by'] or users[old_owner]
        elif transaction.get('order_point_request_id'):
            order = next(o for o in result['orders'] if o['id'] == transaction['order_point_request_id'])
            transaction['created_by'] = transaction['created_by'] or order['reviewed_by']
    return result


def insert(conn, table, row):
    columns = list(row)
    values = [Jsonb(row[c]) if c in JSON_COLUMNS else row[c] for c in columns]
    statement = sql.SQL('insert into public.{} ({}) values ({})').format(
        sql.Identifier(table), sql.SQL(',').join(map(sql.Identifier, columns)),
        sql.SQL(',').join(sql.Placeholder() for _ in columns))
    conn.execute(statement, values)


def verify(conn, imported, users):
    counts = {}
    for key, table in TABLES.items():
        ids = [r['id'] for r in imported[key]]
        count = conn.execute(sql.SQL('select count(*) from public.{} where id=any(%s::uuid[])').format(sql.Identifier(table)), (ids,)).fetchone()[0]
        if count != len(ids):
            raise RuntimeError('Imported row count mismatch: ' + table)
        counts[key] = count
        for expected_row in imported[key]:
            actual_row = conn.execute(sql.SQL('select to_jsonb(t) from public.{} t where id=%s').format(sql.Identifier(table)), (expected_row['id'],)).fetchone()[0]
            for field, expected in expected_row.items():
                actual = actual_row.get(field)
                if field.endswith('_at') and expected is not None:
                    actual = datetime.fromisoformat(actual.replace('Z', '+00:00'))
                    expected = datetime.fromisoformat(expected.replace('Z', '+00:00'))
                if actual != expected:
                    raise RuntimeError('Imported field mismatch: ' + table + '.' + field)
    balances = {}
    for old_id, expected in source_balances(imported).items():
        ids = [r['id'] for r in imported['transactions'] if r['customer_id'] == old_id]
        actual = conn.execute('select coalesce(sum(case when type=\'credit\' then points else -points end),0) from public.point_transactions where customer_id=%s and id=any(%s::uuid[])', (old_id, ids)).fetchone()[0]
        if actual != expected:
            raise RuntimeError('Imported point balance mismatch')
        balances[old_id] = actual
    for product in imported['products']:
        actual = conn.execute('select name,category,points,status,variants,options,image_urls from public.products where id=%s', (product['id'],)).fetchone()
        wanted = tuple(product[k] for k in ['name','category','points','status','variants','options','image_urls'])
        if actual != wanted:
            raise RuntimeError('Product fields do not match the source')
    return {'counts': counts, 'balances': balances, 'images': len({u for p in imported['products'] for u in p['image_urls']}), 'verified': True}


def apply(data, source_hash, admin_email):
    # Backup first, including every referenced image, before any remote mutations.
    backup = ROOT / '.local-test/migration' / source_hash
    backup.mkdir(parents=True, exist_ok=True)
    if not (backup / 'source.json').exists():
        shutil.copy2(SOURCE, backup / 'source.json')
        for url, path in image_files(data).items():
            dest = backup / 'public' / url.lstrip('/')
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, dest)
    with connect() as conn:
        conn.execute('create table if not exists bags_star_migrations.data_imports (source_hash text primary key, report jsonb not null, imported_at timestamptz not null default now())')
        conn.execute('revoke all on bags_star_migrations.data_imports from public,anon,authenticated')
        receipt = conn.execute('select report from bags_star_migrations.data_imports where source_hash=%s', (source_hash,)).fetchone()
        if receipt:
            return {'already_imported': True, **receipt[0]}
        for table in TABLES.values():
            if conn.execute(sql.SQL('select count(*) from public.{}').format(sql.Identifier(table))).fetchone()[0]:
                raise RuntimeError('Cloud business data is not empty; refusing to overwrite or duplicate')
    users = ensure_accounts(data, admin_email)
    images = upload_images(data)
    imported = transformed(data, users, images)
    with connect() as conn:
        conn.execute("select pg_advisory_xact_lock(hashtextextended('bags-star-local-import',0))")
        for table in TABLES.values():
            conn.execute(sql.SQL('lock table public.{} in exclusive mode').format(sql.Identifier(table)))
            if conn.execute(sql.SQL('select count(*) from public.{}').format(sql.Identifier(table))).fetchone()[0]:
                raise RuntimeError('Cloud business data changed during migration')
        if digest(SOURCE.read_bytes()) != source_hash:
            raise RuntimeError('Local data changed; repeat with a fresh snapshot')
        for category in data['categories']:
            existing = conn.execute('select id from public.product_categories where name=%s', (category['name'],)).fetchone()
            if not existing:
                insert(conn, 'product_categories', category)
        for key in ['products', 'orders', 'redemptions']:
            for row in imported[key]:
                insert(conn, TABLES[key], row)
        for row in sorted(imported['transactions'], key=lambda r: (r['created_at'], r['id'])):
            conn.execute("select set_config('request.jwt.claims',%s,true)", (json.dumps({'sub': row.get('created_by'), 'app_metadata': {'role':'admin'}}),))
            insert(conn, 'point_transactions', row)
        for local_id, read_ids in data.get('notificationReads', {}).items():
            for notification_id in read_ids:
                insert(conn, 'notification_reads', {'customer_id': users[local_id], 'notification_id': notification_id})
        report = verify(conn, imported, users)
        conn.execute('insert into bags_star_migrations.data_imports(source_hash,report) values(%s,%s)', (source_hash, Jsonb(report)))
    (backup / 'report.json').write_text(json.dumps({'source_hash': source_hash, 'users': users, 'images': images, **report}, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['plan','apply'])
    parser.add_argument('--admin-email')
    args = parser.parse_args()
    try:
        data, source_hash = source_data()
        if args.command == 'apply' and not args.admin_email:
            raise RuntimeError('--admin-email is required')
        result = plan(data) if args.command == 'plan' else apply(data, source_hash, args.admin_email)
        print(json.dumps(result))
    except Exception as error:
        message = str(error)
        for key, value in config().items():
            if ('PASSWORD' in key or 'SECRET' in key) and value:
                message = message.replace(value, '[REDACTED]')
        print(json.dumps({'error': message}))
        raise SystemExit(1)
