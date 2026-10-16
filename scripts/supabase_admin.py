"""Assign the application admin role to one confirmed, explicitly named Auth user.

This does not create Auth identities, set passwords, or send email. Create the
account through Supabase Auth first. Run: python scripts/supabase_admin.py EMAIL
"""
import argparse
import json
from supabase_db import connect, config

def promote(email):
    with connect() as conn:
        row = conn.execute(
            'select id,email_confirmed_at,raw_app_meta_data from auth.users where lower(email)=lower(%s) for update',
            (email.strip(),),
        ).fetchone()
        if row is None:
            raise RuntimeError('Account not found. Create this user in Supabase Auth first.')
        if row[1] is None:
            raise RuntimeError('Email is not confirmed. Complete account confirmation first.')
        conn.execute(
            "update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb) || jsonb_build_object('role','admin'), updated_at=now() where id=%s",
            (row[0],),
        )
        role = conn.execute("select raw_app_meta_data->>'role' from auth.users where id=%s",(row[0],)).fetchone()[0]
        if role != 'admin':
            raise RuntimeError('Role verification failed')
    return {'admin_role_configured': True, 'sign_in_again_to_refresh_role': True}

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('email', help='The exact administrator email approved by the project owner')
    args=parser.parse_args()
    try:
        print(json.dumps(promote(args.email)))
    except Exception as exc:
        secret=config().get('PGPASSWORD','')
        print(json.dumps({'error':str(exc).replace(secret,'[REDACTED]') if secret else str(exc)}))
        raise SystemExit(1)
