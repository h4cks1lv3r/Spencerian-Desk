# Spencerian Lab 1.1.1 startup repair

Version 1.1.0 was installed and launched on an Android 15 / API 35 emulator. It immediately crashed with a NullPointerException in PhoneWindow.getInsetsController, called before the window's DecorView existed. The clean stack is in `runtime/original-launch-crash.txt`.

Version 1.1.1 moves system-bar controller setup after `setContentView(web)`. The updated Activity passed that crash point on the same emulator. It also provides a native recovery screen for startup exceptions and renderer loss, with Retry and explicitly copied diagnostics. Recovery does not clear progress or provider settings.

The APK compiled with Android SDK platform 36 revision 2, build tools 36.0.0, and JDK 17.0.20. SDK archives came from Google's official Android repository and matched its published checksums.

## Final artifact

| Item | Result |
| --- | --- |
| File | `output/Spencerian-Lab-v1.1.1.apk` |
| Package | `com.royal.spencerianlab` |
| Version | 1.1.1, code 3 |
| Android support | API 26 and later; target API 36 |
| Size | 16,383,002 bytes (16.38 MB) |
| SHA-256 | `ad6f1d32321b3ee2279b5c1e010845b47ee98230fc72fa837ca7bc1401ef6d40` |
| Signing | APK v2 and v3 signatures verify; the original development certificate is retained |
| Alignment | `zipalign -c -P 16 4` passes |
| Asset audit | All 34 packaged asset files exactly match source bytes, including the bundled font and its license; no missing or extra assets |
| Course content | 80 lessons and 22 atlas plates retained |
| Progress compatibility | Storage module, curriculum, and atlas remain byte-identical to the prior source |
| Startup repair | Insets controller requested after Android creates the window content |

The signing certificate SHA-256 fingerprint is `680e45d2c014ccb9da17e33517022f7422597585831c17c910dbe1323f36a657`. It exactly matches versions 1.0.0 and 1.1.0. The emulator accepted an in-place update from version 1.1.0. A physical-phone upgrade has not been tested. Private signing files were neither regenerated nor packaged in the APK.

## Checks for this update

| Check | Result | Scope |
| --- | --- | --- |
| Android compilation | Passed | Resource compilation/linking, Java compilation, DEX compilation, packaging, signing, and alignment |
| Original native launch | Crash reproduced | Null DecorView in PhoneWindow.getInsetsController |
| Corrected initialization | Passed original crash point | Updated MainActivity displayed without the Insets exception |
| Renderer-loss recovery | Observed | Native process stayed alive and displayed the recovery screen after renderer exit |
| Full home-screen launch | Blocked by emulator WebView failure | An independent minimal HTML/JavaScript control also lost its renderer |
| Native boundary suite | 29 passed | Offline provider, credential, and file-transfer validation boundaries |
| Packaged asset comparison | 34 of 34 matched | Exact byte comparison between final source assets and final APK |
| Signing continuity | Passed | Exact comparison against the original certificate fingerprint |

All 34 asset files are also byte-identical to version 1.1.0. Its 18 DOM integration checks and 12 geometry checks passed in the previous update; those unchanged suites were not repeated for this native repair.

Reproduce the relevant suites from the project directory:

```sh
sh tests/native/run.sh /absolute/path/to/android-sdk
python3 tests/android/launch_smoke.py output/Spencerian-Lab-v1.1.1.apk --sdk /absolute/path/to/android-sdk --timeout 180
```

## Verification limits

The first automated launch gate failed and is retained as a failure. Under software emulation, UIAutomator exceeded its original 20-second timeout, unrelated Digital Wellbeing and system ANR dialogs appeared, and WebView 124's renderer exited with SIGTRAP. Spencerian's process stayed alive and displayed the native recovery screen. After dismissing the fixture dialogs, Retry was tapped in the same Activity; the process stayed resumed but the renderer failed again. The separate follow-up check is also retained as a failure.

An independent minimal native WebView control, containing only inline HTML and a tiny JavaScript DOM update, also lost its renderer with code 5 before its page-finished/DOM callback. It contained no Spencerian assets, curriculum, interceptor, CSP, or bridge. This isolates the remaining rendering failure to the common WebView/runtime setup and prevents a full home-screen validation here. The original Insets crash is reproduced and repaired; a successful course-home render is not claimed.

The launch gate's UI timeout has been increased for slower environments. A native error page, blank view, or splash screen cannot pass its loaded-home assertions. Runtime evidence is retained in `docs/runtime/`.

The DOM suite uses jsdom, fake IndexedDB, and a stub canvas; it does not render Android pixels. A physical Samsung S24 Ultra and Android 16 have not been tested in this repair. S Pen pressure/palm rejection, file pickers, complete lesson workflows, and live paid AI calls remain unverified here. This APK is a signed development build, not a Play Store release.
