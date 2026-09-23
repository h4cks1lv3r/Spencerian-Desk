#!/usr/bin/env python3
"""Install an update and verify the real Android/WebView launch on a connected device."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET


PACKAGE = "com.royal.spencerianlab"
# These strings are rendered by homePage() in the shipped assets/app.js.
HOME_HEADING = "Make every stroke intentional."
HOME_CONTROL = "Continue learning"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path, help="Signed APK to install over the existing app")
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--sdk", type=Path, help="Android SDK containing platform-tools/adb")
    source.add_argument("--adb", help="Path to adb; otherwise use SDK environment or PATH")
    parser.add_argument("--serial", help="adb device serial (required if several devices are connected)")
    parser.add_argument("--timeout", type=float, default=45, help="Launch timeout in seconds (default: 45)")
    parser.add_argument("--output", type=Path, help="Evidence directory; default: output/android-launch-TIMESTAMP")
    args = parser.parse_args()
    if not args.apk.is_file():
        parser.error("APK does not exist: " + str(args.apk))
    if args.timeout < 10 or args.timeout > 180:
        parser.error("--timeout must be between 10 and 180 seconds")
    sdk = args.sdk or os.environ.get("ANDROID_SDK_ROOT") or os.environ.get("ANDROID_HOME")
    adb = args.adb or (str(Path(sdk) / "platform-tools" / ("adb.exe" if os.name == "nt" else "adb")) if sdk else shutil.which("adb"))
    if not adb or not (Path(adb).is_file() or shutil.which(adb)):
        parser.error("adb is unavailable; provide --sdk or --adb")
    output = args.output or Path(__file__).resolve().parents[2] / "output" / ("android-launch-" + time.strftime("%Y%m%d-%H%M%S"))
    output.mkdir(parents=True, exist_ok=True)
    serial = args.serial or os.environ.get("ANDROID_SERIAL")
    report = {"passed": False, "package": PACKAGE, "apk": str(args.apk.resolve()),
              "apk_sha256": hashlib.sha256(args.apk.read_bytes()).hexdigest(), "timeout_seconds": args.timeout}
    log_process = None
    remote_ui = "/sdcard/spencerian-launch-smoke-" + str(os.getpid()) + ".xml"
    selected = False

    def run(*command, timeout=15, check=True, binary=False):
        prefix = [adb] + (["-s", serial] if serial else [])
        result = subprocess.run(prefix + list(command), capture_output=True, timeout=timeout,
                                text=not binary, encoding=None if binary else "utf-8",
                                errors=None if binary else "replace")
        if check and result.returncode:
            error = result.stderr or result.stdout
            if isinstance(error, bytes):
                error = error.decode("utf-8", "replace")
            raise RuntimeError("adb " + " ".join(command) + ": " + error.strip())
        return result

    def shell(*command, **kwargs):
        return run("shell", *command, **kwargs).stdout

    def activity_state():
        text = shell("dumpsys", "activity", "activities", timeout=10)
        (output / "activity-state.txt").write_text(text, encoding="utf-8")
        # Android releases expose either name; require this package in a resumed record.
        resumed = any(PACKAGE + "/" in line and
                      ("mResumedActivity" in line or "topResumedActivity" in line)
                      for line in text.splitlines())
        return resumed

    def dump_ui(timeout=60):
        result = run("shell", "uiautomator", "dump", remote_ui, timeout=timeout, check=False)
        if result.returncode or "ERROR" in result.stdout + result.stderr:
            return None
        content = run("shell", "cat", remote_ui, check=False).stdout
        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            return None
        (output / "ui.xml").write_text(content, encoding="utf-8")
        return root

    def home_loaded(root):
        if root is None:
            return False
        heading = False
        control = False

        def visit(node, in_webview=False, clickable=False):
            nonlocal heading, control
            attributes = node.attrib
            in_webview = in_webview or attributes.get("class") == "android.webkit.WebView"
            clickable = clickable or attributes.get("clickable") == "true" or attributes.get("class", "").endswith(".Button")
            text = " ".join((attributes.get("text", ""), attributes.get("content-desc", "")))
            if in_webview and attributes.get("package", PACKAGE) == PACKAGE:
                heading = heading or HOME_HEADING in text
                control = control or (HOME_CONTROL in text and clickable and attributes.get("enabled") != "false")
            for child in node:
                visit(child, in_webview, clickable)

        visit(root)
        return heading and control

    try:
        devices = run("devices").stdout.splitlines()
        ready = [line.split()[0] for line in devices if len(line.split()) == 2 and line.split()[1] == "device"]
        if serial:
            if serial not in ready:
                raise RuntimeError("Selected device is not connected and authorized: " + serial)
        elif len(ready) != 1:
            raise RuntimeError("Connect and authorize one device, or select one with --serial; found " + str(len(ready)))
        else:
            serial = ready[0]
        selected = True
        report.update(serial=serial, model=shell("getprop", "ro.product.model").strip(),
                      android_sdk=shell("getprop", "ro.build.version.sdk").strip())
        if shell("getprop", "sys.boot_completed").strip() != "1":
            raise RuntimeError("Device has not finished booting")
        print("Installing update on " + serial + " (app data is retained).", flush=True)
        install = run("install", "--no-incremental", "-r", str(args.apk.resolve()), timeout=300)
        (output / "install.txt").write_text(install.stdout + install.stderr, encoding="utf-8")
        if "Success" not in install.stdout:
            raise RuntimeError("APK installation did not report Success")
        resolved = shell("cmd", "package", "resolve-activity", "--brief", "--user", "current",
                         "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER", PACKAGE)
        component = next((line.strip() for line in resolved.splitlines()
                          if re.fullmatch(re.escape(PACKAGE) + r"/[A-Za-z0-9_.$]+", line.strip())), None)
        if not component:
            raise RuntimeError("Could not resolve the installed launcher Activity")
        report["launcher"] = component
        with (output / "android-runtime.log").open("wb") as log:
            # Capture new runtime errors without clearing the device's existing logs.
            log_process = subprocess.Popen([adb, "-s", serial, "logcat", "-b", "main", "-b", "crash",
                                            "-v", "threadtime", "-T", "1", "AndroidRuntime:E", "chromium:E", "*:S"],
                                           stdout=log, stderr=subprocess.STDOUT)
            shell("am", "force-stop", "--user", "current", PACKAGE)
            started = time.monotonic()
            launch = shell("am", "start", "-W", "--user", "current", "-n", component,
                           timeout=args.timeout)
            (output / "launch.txt").write_text(launch, encoding="utf-8")
            if "Error:" in launch or "Exception" in launch:
                raise RuntimeError("Android rejected the launch; see launch.txt")
            observed_pid = None
            loaded_since = None
            while time.monotonic() - started < args.timeout:
                pid = shell("pidof", PACKAGE, check=False).strip()
                if not pid and time.monotonic() - started > 3:
                    raise RuntimeError("App process exited during startup")
                if observed_pid and pid != observed_pid:
                    raise RuntimeError("App process restarted during startup")
                observed_pid = pid or observed_pid
                if pid and activity_state():
                    try:
                        loaded = home_loaded(dump_ui())
                    except subprocess.TimeoutExpired:
                        loaded = False
                    if loaded:
                        loaded_since = loaded_since or time.monotonic()
                        if time.monotonic() - loaded_since >= 5:
                            report.update(passed=True, pid=pid, home_heading=HOME_HEADING,
                                          home_control=HOME_CONTROL, elapsed_seconds=round(time.monotonic() - started, 2))
                            break
                    else:
                        loaded_since = None
                else:
                    loaded_since = None
                time.sleep(0.5)
            if not report["passed"]:
                raise RuntimeError("Timed out before a resumed Activity displayed the loaded home controls")
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        report["error"] = str(error)
    finally:
        if selected:
            for capture in (
                lambda: activity_state(),
                lambda: dump_ui(),
                lambda: (output / "screen.png").write_bytes(run("exec-out", "screencap", "-p", binary=True).stdout),
            ):
                try:
                    capture()
                except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
                    report.setdefault("capture_errors", []).append(str(error))
            try:
                shell("rm", "-f", remote_ui, check=False)
            except (OSError, subprocess.TimeoutExpired):
                pass
            if report["passed"]:
                try:
                    if shell("pidof", PACKAGE, check=False).strip() != report["pid"] or not activity_state():
                        report.update(passed=False, error="App stopped or left the resumed state while collecting evidence")
                except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
                    report.update(passed=False, error="Final liveness check failed: " + str(error))
        if log_process:
            log_process.terminate()
            try:
                log_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                log_process.kill()
                log_process.wait()
        (output / "result.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(("PASS" if report["passed"] else "FAIL: " + report.get("error", "Launch failed")) + " — " + str(output.resolve()))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
