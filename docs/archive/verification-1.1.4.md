# Spencerian Lab 1.1.4 verification

This update uses the user-selected photograph as the visual direction for advanced writing and personal signature coaching. Four clean capital studies are added to the existing 94 book-based models. The 80-lesson sequence, folded-paper theme, progress schema, and native Android code are retained.

## Package

| Item | Result |
| --- | --- |
| APK | `output/Spencerian-Lab-v1.1.4.apk` |
| Package | `com.royal.spencerianlab` |
| Version | 1.1.4, code 6 |
| Android | Minimum API 26; target API 36 |
| Bytes | 1251157 |
| SHA-256 | `b33d3aa4697c3ffb51275bd2bfd045e0734deafca162a03873a62941a9bdff96` |
| Signatures | Original certificate; APK v2 and v3 verify |
| Alignment | `zipalign -c -P 16 4` passes |

Certificate SHA-256: `680e45d2c014ccb9da17e33517022f7422597585831c17c910dbe1323f36a657`.

## Verified behavior and package contents

- All 23 DOM integration tests pass, covering every route and all 80 lessons, completion gates, progress, backup validation, storage failures, artwork enlargement, AI consent, and bounded AI concept handling.
- The new tests confirm that the chosen reference opens from home, its models enlarge to 300%, source captions identify the photograph, the first lesson still uses its basic model, and opening the reference leaves progress intact.
- The signature coach receives a textual style brief after consent. The reference photograph is not automatically transmitted; existing explicit image attachment behavior remains unchanged.
- Resource compilation, Java/DEX compilation, signing, and alignment pass with Android SDK 36 and Java 17. Manifest inspection confirms version code 6 and the existing launch Activity.
- All 132 APK asset files match the working source exactly. There are 98 main models, 23 reference collections, and 121 SVG files including existing montage panels. Every lesson has valid model references.
- All 94 existing book-based model files are byte-identical to version 1.1.3. SVG XML parses without embedded raster images, scripts, foreign objects, or external image references. There are no page photographs among the APK teaching assets.
- `classes.dex` is byte-identical to version 1.1.3. Independent source comparison also found the five native Java files and the storage, practice, and signature modules unchanged. The existing startup repair is retained.
- The four final capital studies and their presentation sheet were rendered and visually inspected. The source photograph’s tiny lowercase was not used to invent full-word models. Source-based capital curves, pressure strokes, and local reconstruction limits are documented in `chosen-reference-provenance.json`.
- The source archive excludes private signing files, build output, dependency directories, and compiled files.

## Scope and limits

DOM tests use jsdom and do not render Android pixels. This update has not been launched on a physical phone or emulator. Live paid AI requests, Android file pickers, and physical stylus behavior were not tested in this update. The earlier startup-repair evidence and emulator WebView limitation remain in `startup-repair-verification.md` and `runtime/`. Prior artwork verification is retained in `artwork-1.1.3-verification.md`.

The capital studies are source-based redraws, not untouched facsimiles, stroke-order recordings, or independent evidence of an exact measured slant. The course’s existing geometric 52-degree guide and PDF-based lowercase and word models remain the instructional references for those skills.

Install over the existing app to retain its local progress. The original package and signing identity and the increasing version code support an in-place update.

Run DOM checks from `tests/dom` using `npm ci --ignore-scripts` and `npm test`. Register reviewed reference SVGs with `python3 tools/register_reference_style.py`; render the presentation sheet with `python3 tools/render_reference_preview.py` when `rsvg-convert` is on PATH.
