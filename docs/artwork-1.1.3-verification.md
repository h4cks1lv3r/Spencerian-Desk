# Spencerian Lab 1.1.3 verification

This update replaces page snapshots and generic decorative examples with 94 clean vector study models matched to all 80 lessons. The home preview follows the next incomplete lesson. Every model can be enlarged, and 22 reference collections group the same selected examples.

## Artifact

| Item | Result |
| --- | --- |
| File | `output/Spencerian-Lab-v1.1.3.apk` |
| Package | `com.royal.spencerianlab` |
| Version | 1.1.3, code 5 |
| Android support | Minimum API 26; target API 36 |
| Size | 1,234,464 bytes |
| SHA-256 | `c8034438d07702be9a454b2ae46f941aed0c934d0e7e61daa66c26d61c56220d` |
| Signing | Original development certificate; APK v2 and v3 signatures verify |
| Alignment | `zipalign -c -P 16 4` passes |

Certificate SHA-256: `680e45d2c014ccb9da17e33517022f7422597585831c17c910dbe1323f36a657`.

## Checks performed

- Resource, Java, and DEX compilation, packaging, signing, and alignment passed with Android platform 36 r02, build-tools 36.0.0, and Java 17.
- Manifest inspection confirms package, version 1.1.3/code 5, and the existing launch Activity.
- All 21 DOM integration checks passed, including every route and all 80 lessons; model changes when the next lesson advances; matching source references; enlargement from 100–300%; zoom reset; reference-collection navigation; and preservation of progress.
- All 128 packaged asset files exactly match the working source bytes.
- There are 117 SVG illustration files: 94 main models and 23 individual montage panels. Their XML parses without embedded raster images, scripts, foreignObject nodes, or remote image references. No JPG, PNG, or other page snapshots remain among APK teaching assets.
- `classes.dex` is byte-identical to version 1.1.2. The existing Android startup repair is retained without native class changes. Course progression, storage schema, AI connections, practice engine, and signature generator are unchanged.
- Models were inspected as rendered SVG proofs, with enlarged reviews of letter joins, dots, counters, shading, and fine ornamental curves. Source variants and target letter families were checked against the cited book models. The severe scan defects found in the first tracing pass were resolved with reviewed source-guided vector reconstructions.
- The 52-degree slant illustration uses exact trigonometric geometry. Its measured main line is 52.00000003 degrees, within 1e-6 degree of the target.
- Private signing files and build dependencies are excluded from the source archive.

## Artwork provenance

`example-artwork.md` explains the source selection, cleaner copy of the original Compendium scan, conservative Key contour smoothing, centerline fitting, and source-guided redraws. The model manifest contains exact source pages, crops, exceptions, and reconstruction notes. Editable reviewed SVGs are retained in `tools/source-tracings/`. Redrawn examples are identified in their app source captions; the combined bird-and-verse page is a new teaching arrangement of two cited models.

These are source-based study reproductions, not untouched facsimiles or certified pen-stroke-order recordings. They use actual source constructions and regularized curves rather than a cursive font or generated handwriting.

## Scope and limits

SVG artwork was rendered and visually inspected. DOM checks use jsdom and do not render Android pixels. This update was not launched on a physical phone or emulator. The user's supplied screenshot demonstrates the prior app running on their device; it is not evidence of the new build's rendering. Prior startup-repair evidence and the emulator WebView limitation remain in `startup-repair-verification.md` and `runtime/`.

The unchanged package and signing identity, together with the increasing version code, make this eligible for an in-place update. Install over the existing app to keep local progress.

Run the DOM checks from `tests/dom` with `npm ci --ignore-scripts` followed by `npm test`.
