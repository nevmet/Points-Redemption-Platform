"""Upgrade only the existing rewards site; retain the previous release for rollback."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.request
import zipfile

release = sys.argv[1]
if not re.fullmatch(r'bags-star-\d{8}T\d{6}Z', release):
    raise SystemExit('Invalid release name')
incoming = Path('/root/bags-star-rewards-deploy')
base = Path('/www/wwwroot/bags-star-rewards')
current = base / 'current'
assert current.is_symlink(), 'Expected an existing release symlink'
previous = current.resolve(strict=True)
assert previous.is_relative_to((base / 'releases').resolve())
target = base / 'releases' / release
assert not target.exists(), 'Never overwrite an existing release'
configs = [Path('/www/server/panel/vhost/nginx/' + name) for name in
           ['bags-star-rewards.conf', 'www.bags-star.com.conf', '0.default.conf']]
hashes = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in configs}
archive = incoming / (release + '.zip')
manifest = json.loads((incoming / (release + '.manifest.json')).read_text())
assert manifest['release'] == release
assert hashlib.sha256(archive.read_bytes()).hexdigest() == manifest['archive_sha256']
with zipfile.ZipFile(archive) as bundle:
    expected = {entry['path']: entry for entry in manifest['files']}
    assert len(bundle.namelist()) == len(expected) == manifest['file_count']
    assert set(bundle.namelist()) == set(expected)
    for name in bundle.namelist():
        assert (target / name).resolve().is_relative_to(target.resolve())
        assert not any(part.startswith('.') for part in Path(name).parts)
        body = bundle.read(name)
        assert len(body) == expected[name]['bytes']
        assert hashlib.sha256(body).hexdigest() == expected[name]['sha256']
    target.mkdir(parents=True)
    bundle.extractall(target)

# Keep old hashed assets reachable for tabs that still hold the previous index.
old_assets = previous / 'assets'
for old in old_assets.rglob('*'):
    if old.is_file():
        dest = target / 'assets' / old.relative_to(old_assets)
        if dest.exists():
            assert hashlib.sha256(dest.read_bytes()).digest() == hashlib.sha256(old.read_bytes()).digest()
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(old, dest)
for path in [target, *target.rglob('*')]:
    path.chmod(0o755 if path.is_dir() else 0o644)
backup = incoming / (release + '.server-backup')
backup.mkdir(mode=0o700)
for config in configs:
    shutil.copy2(config, backup / config.name)
(backup / 'previous-release.txt').write_text(str(previous))
subprocess.run(['/www/server/nginx/sbin/nginx', '-t'], check=True)
assert current.resolve() == previous
next_link = base / ('.next-' + release)
assert not next_link.exists() and not next_link.is_symlink()
next_link.symlink_to(target, target_is_directory=True)
os.replace(next_link, current)
try:
    request = urllib.request.Request('https://www.bag-star.com/signin', headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=15) as response:
        assert response.status == 200
        assert hashlib.sha256(response.read()).hexdigest() == expected['index.html']['sha256']
    for config in configs:
        assert hashlib.sha256(config.read_bytes()).hexdigest() == hashes[str(config)]
except BaseException:
    next_link.symlink_to(previous, target_is_directory=True)
    os.replace(next_link, current)
    raise
receipt = {'release': release, 'previous_release': previous.name, 'archive_sha256': manifest['archive_sha256'],
           'url': 'https://www.bag-star.com', 'configs_unchanged': True, 'http_index_verified': True}
(incoming / (release + '.receipt.json')).write_text(json.dumps(receipt, indent=2))
print(json.dumps(receipt))
