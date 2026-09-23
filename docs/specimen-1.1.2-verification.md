# Spencerian Lab 1.1.2 verification

The home next-lesson card now shows authentic Spencerian lettering from Compendium Plate 5 and links to the full original plate. The visual source and crop are recorded in `specimen-example.md`.

## Artifact

| Item | Result |
| --- | --- |
| File | `output/Spencerian-Lab-v1.1.2.apk` |
| Package | `com.royal.spencerianlab` |
| Version | 1.1.2, code 4 |
| Android support | Minimum API 26; target API 36 |
| Size | 16,383,002 bytes |
| SHA-256 | `808149c226b02756391ae538c9fae9212d5d21c980d26c3fa1e24ea15e3fd768` |
| Signing | Original development certificate; APK v2 and v3 signatures verify |
| Alignment | `zipalign -c -P 16 4` passes |

Certificate SHA-256: `680e45d2c014ccb9da17e33517022f7422597585831c17c910dbe1323f36a657`.

## Checks performed

- Resource, Java, and DEX compilation, packaging, signing, and alignment passed using Android platform 36 r02 and build-tools 36.0.0 with Java 17.
- Package inspection confirms version 1.1.2/code 4 and the existing launch Activity.
- All 18 existing DOM integration tests passed, including every route and all 80 lessons.
- A focused DOM interaction check opened the new specimen button, confirmed the full image and PDF page 76/Plate 5 reference, closed the viewer, confirmed unchanged progress, and followed Continue learning successfully.
- All 34 APK asset files exactly match source bytes.
- `classes.dex` is byte-identical to the installed-source baseline APK, version 1.1.1. The native startup repair is retained without native code changes.
- Only `AndroidManifest.xml`, `assets/app.js`, and `assets/style.css` differ among ZIP entries shared with APK 1.1.1. The curriculum, atlas, storage module, historical scans, practice/signature modules, and font are unchanged.
- The original crop was visually inspected, including the final exit stroke. An independent static review checked crop proportions, responsive rules, accessible labels, source attribution, and the existing tap handler.

## Scope and limits

The image was inspected directly; DOM checks use jsdom and do not render Android pixels. This update was not launched on a physical phone or emulator. The user’s supplied screenshot shows the prior app running on their device; it is not evidence for the new build’s rendering. Prior startup-repair evidence and the emulator WebView limitation remain in `startup-repair-verification.md` and `runtime/`.

The unchanged signing identity, package, and increasing version code make this eligible for an in-place update. Install over the existing app to keep local data. Private signing files are excluded from the source ZIP.

Run the existing DOM checks from `tests/dom` with `npm ci --ignore-scripts` followed by `npm test`.
