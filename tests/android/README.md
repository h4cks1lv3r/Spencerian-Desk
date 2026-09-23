# Android launch gate

Run this before distributing an APK. It uses Python 3 and Android platform-tools on an already booted, unlocked, authorized emulator or phone. It does not start an emulator.

```sh
python3 tests/android/launch_smoke.py releases/The-Spencerian-Desk-v1.3.1.apk --sdk /absolute/path/to/android-sdk
```

You can supply `--adb /absolute/path/to/adb` instead. With multiple devices, add `--serial emulator-5554`. `ANDROID_SDK_ROOT`, `ANDROID_HOME`, and `ANDROID_SERIAL` are supported. Use `--timeout 60` for a slower emulator and `--output /absolute/path/to/evidence` to set the evidence directory.

The script installs with `adb install --no-incremental -r`, retaining existing app data and requiring a compatible signing identity. It then force-stops the app, resolves and starts its actual launcher Activity, and checks the app process and resumed Activity. A pass requires the rendered WebView home heading **Make every stroke intentional.** and enabled **Continue learning** control from `assets/app.js`, followed by at least five seconds of stable operation. A blank WebView, native recovery screen, stopped process, or splash screen cannot pass. No lesson or user preference is changed by the test.

Evidence includes `result.json`, installation and launch output, Activity state, `android-runtime.log`, the UI hierarchy, and a screenshot. The test does not clear device logs or app data. UI dumping depends on Android accessibility; a locked screen or unavailable WebView accessibility tree causes a failure and requires inspection of the captured evidence.

This is a launch gate. It does not prove S Pen, provider, file picker, or lesson workflow correctness.
