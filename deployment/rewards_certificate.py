"""Issue/renew only the rewards certificate using the installed panel ACME client.

Run with /www/server/panel/pyenv/bin/python. No package installation or
changes to the company's certificate/configuration. Private state stays root-only.
"""
import datetime
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys

# Fail before importing the panel module if its optional dependencies are missing.
import OpenSSL  # noqa: F401
import dns.resolver  # noqa: F401
from cryptography import x509
from cryptography.hazmat.primitives import serialization

PANEL = Path('/www/server/panel')
STATE = Path('/root/bags-star-rewards-deploy/acme')
CERTS = PANEL / 'vhost/cert/bags-star-rewards'
WEBROOT = Path('/www/wwwroot/bags-star-rewards/acme')
DOMAINS = ['www.bag-star.com', 'bag-star.com']
NGINX = '/www/server/nginx/sbin/nginx'
os.umask(0o077)
STATE.mkdir(exist_ok=True, mode=0o700)
lock = (STATE / 'renew.lock').open('a')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
current = CERTS / 'current'
if (current / 'fullchain.pem').exists():
    valid = subprocess.run(['openssl', 'x509', '-checkend', str(30 * 86400),
                            '-noout', '-in', str(current / 'fullchain.pem')],
                           capture_output=True).returncode == 0
    if valid:
        print(json.dumps({'status': 'not_due', 'domains': DOMAINS}))
        sys.exit(0)

config_path = STATE / 'account.json'
if not config_path.exists():
    source = json.loads((PANEL / 'config/letsencrypt_v2.json').read_text())
    account = source.get('account', {}).get('Production', {})
    assert account.get('kid') and account.get('key'), 'Existing ACME account required'
    config_path.write_text(json.dumps({'account': {'Production': account},
                                      'apis': {}, 'orders': {}, 'email': source.get('email')}))
sys.path.insert(0, str(PANEL / 'class'))
from acme_v2 import acme_v2  # noqa: E402


class RewardsAcme(acme_v2):
    _conf_file_v2 = str(config_path)
    _save_path = str(CERTS)
    _verify = True

    def get_site_run_path(self, domains):
        assert set(domains) == set(DOMAINS)
        return str(WEBROOT)

    def cloud_check_domain(self, domain):
        return True  # Let's Encrypt performs the actual HTTP-01 validation.

    def write_auth_file(self, auth_to, token, authorization, index):
        assert auth_to == str(WEBROOT) and re.fullmatch(r'[A-Za-z0-9_-]+', token)
        directory = WEBROOT / '.well-known/acme-challenge'
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / token
        path.write_text(authorization)
        path.chmod(0o644)
        return True

    def save_cert(self, cert, index):
        pass  # Validate and install below; never update unrelated panel sites.

    def register(self, existing=False):
        raise RuntimeError('Existing ACME account unavailable; manual repair required')


client = RewardsAcme()
result = client.apply_cert(DOMAINS, auth_type='http', auth_to=str(WEBROOT))
if not result.get('status'):
    print(json.dumps({'status': 'failed', 'message': result.get('msg')}, ensure_ascii=False))
    sys.exit(1)
certificate = x509.load_pem_x509_certificate(result['cert'].encode())
assert set(certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName)
           .value.get_values_for_type(x509.DNSName)) == set(DOMAINS)
private = serialization.load_pem_private_key(result['private_key'].encode(), password=None)
assert private.public_key().public_numbers() == certificate.public_key().public_numbers()
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
target = CERTS / stamp
target.mkdir(parents=True, mode=0o700)
(target / 'privkey.pem').write_text(result['private_key'])
(target / 'fullchain.pem').write_text(result['cert'] + result['root'])
previous = current.resolve() if current.is_symlink() else None
pending = CERTS / '.next'
assert not pending.exists() and not pending.is_symlink()
pending.symlink_to(target, target_is_directory=True)
os.replace(pending, current)
try:
    subprocess.run([NGINX, '-t'], check=True, capture_output=True)
    subprocess.run([NGINX, '-s', 'reload'], check=True, capture_output=True)
except BaseException:
    if previous:
        pending.symlink_to(previous, target_is_directory=True)
        os.replace(pending, current)
    else:
        current.unlink()
    raise
print(json.dumps({'status': 'issued', 'domains': DOMAINS,
                  'not_after': certificate.not_valid_after_utc.isoformat(),
                  'certificate_directory': str(current)}))
