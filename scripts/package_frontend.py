"""Package an already-built cloud frontend. Never include source or local secrets."""
import hashlib
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
dist = ROOT / 'dist'
out = ROOT / '.local-test/releases'


def package():
    files = sorted(p for p in dist.rglob('*') if p.is_file())
    if not (dist / 'index.html').is_file():
        raise RuntimeError('Build the cloud frontend before packaging')
    env = {}
    for line in (ROOT / '.env.supabase.local').read_text(encoding='utf-8-sig').splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            env[key] = value
    secrets = [v.encode() for k, v in env.items() if v and ('PASSWORD' in k or 'SECRET' in k)]
    seen_project = False
    manifest = []
    for path in files:
        name = path.relative_to(dist).as_posix()
        if any(part.startswith('.') for part in Path(name).parts) or path.suffix in ('.map', '.sql', '.py', '.ts'):
            raise RuntimeError('Unexpected file in frontend build: ' + name)
        body = path.read_bytes()
        if any(secret in body for secret in secrets) or re.search(rb'sb_secret_[A-Za-z0-9_-]{20,}', body):
            raise RuntimeError('Private credential found in frontend build: ' + name)
        if path.suffix == '.js' and env['SUPABASE_PROJECT_URL'].encode() in body:
            seen_project = True
        manifest.append({'path': name, 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()})
    if not seen_project:
        raise RuntimeError('Build is not configured for the approved cloud project')
    out.mkdir(parents=True, exist_ok=True)
    release = 'bags-star-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    archive = out / (release + '.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for path in files:
            bundle.write(path, path.relative_to(dist).as_posix())
    summary = {'release': release, 'archive': str(archive), 'archive_bytes': archive.stat().st_size,
               'archive_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
               'file_count': len(files), 'files': manifest}
    (out / (release + '.manifest.json')).write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in summary.items() if k != 'files'}))


if __name__ == '__main__':
    package()
