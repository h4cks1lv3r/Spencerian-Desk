"""Signing-identity regression checks; no SDK, JDK, or private keys required."""
from pathlib import Path
import os
import shutil
import subprocess
import sys
import tempfile
import unittest


BUILD_SCRIPT = Path(__file__).resolve().parents[2] / 'build_apk.py'
KEY_NAME = 'key.json'
STORE_NAME = 'spencerian-lab-development.p12'
KEY_BYTES = b'{"alias":"test","password":"DO_NOT_PRINT_SENTINEL"}'
STORE_BYTES = b'private-keystore-sentinel'


class SigningPreflightTest(unittest.TestCase):
    def check_preflight(self, files, flags, expected):
        with tempfile.TemporaryDirectory(prefix='spencerian-signing-test-') as temporary:
            root = Path(temporary)
            shutil.copy2(BUILD_SCRIPT, root / 'build_apk.py')
            signing = root / '.local-signing'
            signing.mkdir()
            for filename, data in files.items():
                (signing / filename).write_bytes(data)

            sentinel = root / 'build/manual/keep.txt'
            sentinel.parent.mkdir(parents=True)
            sentinel.write_text('preserve this output')

            # These inert executables satisfy PATH discovery in the complete-pair
            # case. A missing SDK must stop the script before either can run.
            tool_bin = root / 'bin'
            tool_bin.mkdir()
            for name in ('java', 'keytool'):
                tool = tool_bin / name
                tool.write_text('#!/bin/sh\nexit 99\n')
                tool.chmod(0o755)
            environment = dict(os.environ)
            environment['PATH'] = str(tool_bin)
            process = subprocess.run(
                [sys.executable, str(root / 'build_apk.py'),
                 '--sdk', str(root / 'missing-sdk'), *flags],
                env=environment, capture_output=True, text=True, timeout=15,
            )
            output = process.stdout + process.stderr
            self.assertNotEqual(process.returncode, 0)
            self.assertIn(expected, output)
            self.assertNotIn('Compiling Android', output)
            self.assertNotIn('DO_NOT_PRINT_SENTINEL', output)
            self.assertEqual(
                {path.name: path.read_bytes() for path in signing.iterdir()},
                files,
                'The preflight must not replace or create signing files.',
            )
            self.assertEqual(sentinel.read_text(), 'preserve this output')

    def test_key_only(self):
        self.check_preflight({KEY_NAME: KEY_BYTES}, [], 'Incomplete signing identity')

    def test_keystore_only(self):
        self.check_preflight({STORE_NAME: STORE_BYTES}, [], 'Incomplete signing identity')

    def test_key_only_release(self):
        self.check_preflight(
            {KEY_NAME: KEY_BYTES}, ['--require-existing-signing'],
            'Incomplete signing identity',
        )

    def test_keystore_only_release(self):
        self.check_preflight(
            {STORE_NAME: STORE_BYTES}, ['--require-existing-signing'],
            'Incomplete signing identity',
        )

    def test_empty_release(self):
        self.check_preflight(
            {}, ['--require-existing-signing'], 'Existing signing identity required',
        )

    def test_invalid_configuration(self):
        self.check_preflight(
            {KEY_NAME: b'{"password":"DO_NOT_PRINT_SENTINEL"}', STORE_NAME: STORE_BYTES},
            [], 'Signing configuration is unreadable or invalid',
        )

    def test_invalid_json(self):
        self.check_preflight(
            {KEY_NAME: b'{DO_NOT_PRINT_SENTINEL', STORE_NAME: STORE_BYTES},
            [], 'Signing configuration is unreadable or invalid',
        )

    def test_complete_pair_reaches_sdk_check(self):
        self.check_preflight(
            {KEY_NAME: KEY_BYTES, STORE_NAME: STORE_BYTES},
            ['--require-existing-signing'], 'Missing build input',
        )


if __name__ == '__main__':
    unittest.main()
