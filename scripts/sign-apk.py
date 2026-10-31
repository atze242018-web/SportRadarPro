#!/usr/bin/env python3
"""Sign an unsigned CI APK with the persistent private owner backup.
The private backup belongs in owner storage, NEVER in the public repository.
Usage: python3 scripts/sign-apk.py unsigned.apk owner-backup.json apksigner.jar output.apk
"""
import base64, json, os, pathlib, subprocess, sys, tempfile
source, backup_path, signer, destination = sys.argv[1:]
backup = json.loads(pathlib.Path(backup_path).read_text())
PINNED_CERTIFICATE = '2d577e2d58f8b6b19c82b8b90bfe60307d6e0fdc8cd853f518c563930361aadc'
if backup.get('certificateSha256') != PINNED_CERTIFICATE:
    raise SystemExit('Refusing a different signing identity')
if backup.get('schema') != 'sportradar.signing.v1':
    raise SystemExit('Unsupported private signing backup')
with tempfile.TemporaryDirectory(prefix='sportradar-sign-') as d:
    store = pathlib.Path(d) / 'release.p12'
    store.write_bytes(base64.b64decode(backup['keystoreBase64'], validate=True))
    store.chmod(0o600)
    env = dict(os.environ, SPORTRADAR_SIGN_PASSWORD=backup['password'])
    subprocess.run(['java', '-jar', signer, 'sign', '--ks', str(store), '--ks-key-alias', 'sportradar', '--ks-pass', 'env:SPORTRADAR_SIGN_PASSWORD', '--key-pass', 'env:SPORTRADAR_SIGN_PASSWORD', '--out', destination, source], env=env, check=True)
    result = subprocess.run(['java', '-jar', signer, 'verify', '--verbose', '--print-certs', destination], capture_output=True, text=True, check=True)
    if backup['certificateSha256'].lower() not in result.stdout.lower():
        pathlib.Path(destination).unlink(missing_ok=True)
        raise SystemExit('Signing certificate does not match the saved identity')
    print(result.stdout)
