#!/usr/bin/env python3
"""Build The Spencerian Desk with Android SDK 36 and JDK 17; no Gradle download.
Private signing inputs stay in .local-signing and must not enter public source archives.
"""
from pathlib import Path
import argparse, subprocess, shutil, json, secrets, os, zipfile, hashlib

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--sdk', default=os.environ.get('ANDROID_SDK_ROOT') or os.environ.get('ANDROID_HOME'), help='SDK with platform 36 and build-tools 36.0.0')
parser.add_argument('--output', default=str(root / 'output' / 'The-Spencerian-Desk-v1.3.1.apk'))
parser.add_argument('--require-existing-signing', action='store_true', help='Require the restored signing pair; never create a new identity for this build')
args = parser.parse_args()
keyinfo = root/'.local-signing/key.json'
keystore = root/'.local-signing/spencerian-lab-development.p12'
has_keyinfo, has_keystore = keyinfo.exists(), keystore.exists()
if has_keyinfo != has_keystore:
    raise SystemExit('Incomplete signing identity. Restore both .local-signing/key.json and the original keystore before building; neither file will be regenerated.')
if args.require_existing_signing and not has_keyinfo:
    raise SystemExit('Existing signing identity required. Restore both private signing files before this release build.')
config = None
if has_keyinfo:
    if not keyinfo.is_file() or not keystore.is_file():
        raise SystemExit('Signing inputs must be regular files. Restore the original private signing pair.')
    try:
        config = json.loads(keyinfo.read_text())
        if not isinstance(config, dict) or not all(isinstance(config.get(field), str) and config[field] for field in ('alias', 'password')):
            raise ValueError('Invalid signing configuration')
    except (OSError, ValueError, TypeError):
        raise SystemExit('Signing configuration is unreadable or invalid. Restore the original private signing pair; it will not be regenerated.') from None
if not args.sdk:
    parser.error('Provide --sdk or set ANDROID_SDK_ROOT.')
sdk = Path(args.sdk).resolve()
bt = sdk / 'build-tools/36.0.0'
android_jar = sdk / 'platforms/android-36/android.jar'
native = root / 'app/src/main'
build = root / 'build/manual'
out = Path(args.output).resolve()
java = shutil.which('java')
keytool = shutil.which('keytool')
if not java or not keytool:
    raise SystemExit('JDK 17 java and keytool must be available on PATH.')
for path in [android_jar, bt / 'aapt2', bt / 'd8', bt / 'zipalign', bt / 'apksigner', native / 'AndroidManifest.xml', native / 'assets/index.html']:
    if not path.exists():
        raise SystemExit('Missing build input: ' + str(path))
if build.exists():
    shutil.rmtree(build)
for path in [build, build/'classes', build/'dex', build/'generated', out.parent, root/'.local-signing']:
    path.mkdir(parents=True, exist_ok=True)

def run(command, **kwargs):
    subprocess.run([str(arg) for arg in command], check=True, **kwargs)

if config is None:
    print('Creating a personal development signing identity. This APK cannot update an existing app signed with the maintainer identity.', flush=True)
print('Compiling Android resources', flush=True)
run([bt/'aapt2', 'compile', '--dir', native/'res', '-o', build/'compiled.zip'])
run([bt/'aapt2', 'link', '-o', build/'resources.apk', '-I', android_jar,
     '--manifest', native/'AndroidManifest.xml', '--java', build/'generated',
     '--min-sdk-version', '26', '--target-sdk-version', '36', '--version-code', '10',
     '--version-name', '1.3.1', '-A', native/'assets', build/'compiled.zip'])
print('Compiling native Java and DEX', flush=True)
sources = sorted((native/'java').rglob('*.java')) + sorted((build/'generated').rglob('*.java'))
run([java, 'com.sun.tools.javac.Main', '-encoding', 'UTF-8', '--release', '8', '-classpath', android_jar, '-d', build/'classes', *sources])
run([bt/'d8', '--release', '--min-api', '26', '--lib', android_jar, '--output', build/'dex', *sorted((build/'classes').rglob('*.class'))])
shutil.copy2(build/'resources.apk', build/'unsigned.apk')
with zipfile.ZipFile(build/'unsigned.apk', 'a') as archive:
    for dex in sorted((build/'dex').glob('*.dex')):
        archive.write(dex, dex.name, compress_type=zipfile.ZIP_DEFLATED)
run([bt/'zipalign', '-f', '-P', '16', '4', build/'unsigned.apk', build/'aligned.apk'])
if config is None:
    config = {'alias': 'spencerianlab', 'password': secrets.token_urlsafe(32)}
    keyinfo.write_text(json.dumps(config))
    os.chmod(keyinfo, 0o600)
env = dict(os.environ)
env['SPENCERIAN_SIGN_PASSWORD'] = config['password']
if not keystore.exists():
    run([keytool, '-genkeypair', '-keystore', keystore, '-storetype', 'PKCS12',
         '-storepass:env', 'SPENCERIAN_SIGN_PASSWORD', '-alias', config['alias'],
         '-keyalg', 'RSA', '-keysize', '3072', '-sigalg', 'SHA256withRSA', '-validity', '10000',
         '-dname', 'CN=Spencerian Lab Development, OU=Personal Applications, O=Spencerian Lab, C=US'], env=env)
    os.chmod(keystore, 0o600)
print('Signing and verifying install package', flush=True)
run([bt/'apksigner', 'sign', '--ks', keystore, '--ks-key-alias', config['alias'],
     '--ks-pass', 'env:SPENCERIAN_SIGN_PASSWORD', '--min-sdk-version', '26',
     '--v1-signing-enabled', 'false', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
     '--out', out, build/'aligned.apk'], env=env)
run([bt/'apksigner', 'verify', '--verbose', '--print-certs', out])
run([bt/'zipalign', '-c', '-P', '16', '4', out])
checksum = hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.apk.sha256').write_text(checksum + '  ' + out.name + '\n')
print('APK: ' + str(out))
print('SHA256: ' + checksum)
