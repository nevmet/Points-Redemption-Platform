"""Run on the approved server as root after uploading a verified frontend archive."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import zipfile

release = sys.argv[1]
if not re.fullmatch(r'bags-star-\d{8}T\d{6}Z', release):
    raise SystemExit('Invalid release name')
incoming = Path('/root/bags-star-rewards-deploy')
base = Path('/www/wwwroot/bags-star-rewards')
target = base / 'releases' / release
current = base / 'current'
config = Path('/www/server/panel/vhost/nginx/bags-star-rewards.conf')
nginx = '/www/server/nginx/sbin/nginx'
company = Path('/www/server/panel/vhost/nginx/www.bags-star.com.conf')
company_hash = hashlib.sha256(company.read_bytes()).hexdigest()
archive = incoming / (release + '.zip')
manifest = json.loads((incoming / (release + '.manifest.json')).read_text())
assert manifest['release'] == release
assert hashlib.sha256(archive.read_bytes()).hexdigest() == manifest['archive_sha256']
assert not target.exists(), 'Release already installed; inspect it instead of overwriting'
assert not config.exists(), 'Existing rewards site requires an explicit upgrade, not initial installation'
assert not current.exists() and not current.is_symlink(), 'Existing installation detected'

with zipfile.ZipFile(archive) as bundle:
    expected = {entry['path']: entry for entry in manifest['files']}
    assert len(bundle.namelist()) == len(expected) == manifest['file_count']
    assert set(bundle.namelist()) == set(expected)
    for name in bundle.namelist():
        resolved = (target / name).resolve()
        assert resolved.is_relative_to(target.resolve()), 'Unsafe archive path'
        assert not any(part.startswith('.') for part in Path(name).parts)
        payload = bundle.read(name)
        assert len(payload) == expected[name]['bytes']
        assert hashlib.sha256(payload).hexdigest() == expected[name]['sha256']
    target.mkdir(parents=True)
    bundle.extractall(target)
for path in [target, *target.rglob('*')]:
    path.chmod(0o755 if path.is_dir() else 0o644)

backup = incoming / (release + '.server-backup')
backup.mkdir(mode=0o700)
shutil.copy2(company, backup / company.name)
shutil.copy2('/www/server/panel/vhost/nginx/0.default.conf', backup / '0.default.conf')
current.symlink_to(target, target_is_directory=True)
try:
    config.write_bytes((incoming / 'nginx-site.conf').read_bytes())
    config.chmod(0o644)
    subprocess.run([nginx, '-t'], check=True)
    subprocess.run([nginx, '-s', 'reload'], check=True)
except BaseException:
    config.unlink(missing_ok=True)
    current.unlink(missing_ok=True)
    subprocess.run([nginx, '-t'], check=True)
    subprocess.run([nginx, '-s', 'reload'], check=True)
    raise
assert hashlib.sha256(company.read_bytes()).hexdigest() == company_hash
receipt = {'release': release, 'archive_sha256': manifest['archive_sha256'],
           'files': manifest['file_count'], 'url': 'http://47.239.234.35',
           'root': str(current), 'company_config_unchanged': True}
(incoming / (release + '.receipt.json')).write_text(json.dumps(receipt, indent=2))
print(json.dumps(receipt))
