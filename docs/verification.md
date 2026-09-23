# Current release verification — The Spencerian Desk 1.3.1

Reviewed and built on 22 September 2026 for the initial GitHub publication. After the original chat stopped with only README.md published, the continuation session recovered this exact signed APK and reran all 104 checks. It independently verified version, certificate, ZIP integrity, alignment, checksum, and all 133 bundled assets without rebuilding or changing the app. This report supersedes the old current-verification entrypoint; historical reports remain in `docs/archive/` and the versioned artwork notes.

## Release identity

| Item | Verified value |
| --- | --- |
| APK | `releases/The-Spencerian-Desk-v1.3.1.apk` |
| Version | 1.3.1, code 10 |
| Package | `com.royal.spencerianlab` |
| Launcher | The Spencerian Desk |
| Bytes | 1,357,721 |
| SHA-256 | `989db6077220276450fae0b40a754c9fb37b08afc7122869386739396791f594` |
| Certificate SHA-256 | `680e45d2c014ccb9da17e33517022f7422597585831c17c910dbe1323f36a657` |
| Signatures | v2 and v3 verified |
| Alignment | `zipalign -c -P 16 4` passed |
| Bundled assets | All 133 match the working files exactly |
| Native DEX | Byte-identical to 1.3.0 |

The original package and signing identity are retained. The increasing version code supports installation over the prior app. The actual phone update remains untested here.

## Automated checks

**104 checks passed** in this review:

| Suite | Count | Scope |
| --- | ---: | --- |
| DOM integration | 41 | Course routes, all lessons, completion, state, backups, name review, photo consent, AI response bounds, finish controls, record limits and protected recovery |
| Signature renderer | 9 | Source glyphs, slant adjustment, complete bounds, distinct drafts, matching finish-study paths |
| Practice geometry | 17 | Guide angles, transformations and movement calculations |
| Native boundaries | 29 | Provider validation, protocol limits, transfer handling and related pure helpers |
| Signing preflight | 8 | Missing or incomplete signing pairs, invalid configuration and safe continuation without reading real signing secrets |

The DOM suite uses jsdom and mocked providers/canvas. The native suite is an offline JVM check of helpers. Neither is a physical Android or live-provider test. The source and native suites were run in this audit; the five new data-protection regressions were run after that repair. Signing tests run in temporary fixtures without an SDK or private keys.

The GitHub workflow at `.github/workflows/verify.yml` runs these suites and an Android build for pushes to `main`, pull requests, or manual dispatch. A local YAML structure check passed. Consult the repository Actions page for actual remote run results; adding a workflow is not evidence of a successful run. CI uses a temporary signing identity and does not produce an update for the maintainer-signed install.

## Confirmed repairs

The audit reproduced a data-loss risk in 1.3.0: normal actions could store more sessions or concepts than the loader accepted, then a later save could replace the rejected state with defaults. Version 1.3.1 rejects new records at the existing 2,000-session / 1,000-concept limits, permits updating an existing digital session, validates writes, and preserves invalid data with an exact recovery export. Only a successful confirmed valid restore removes that protection. Details and reproduction are in [publication-audit.md](publication-audit.md).

The builder now rejects an incomplete signing pair before compilation. `--require-existing-signing` also rejects a missing identity. All current entrypoint documentation now points to 1.3.1; versioned older notes remain historical.

## Artwork and package review

The 1.3.0 vector designs are retained. Their actual rendered comparison, finish study, and six additional names were visually inspected during that work. The oval curves were revised after the first visual review. The teaching assets contain clean vectors, not embedded paper-page photographs. Asset and model mapping checks do not certify every handwritten form as an expert exemplar.

Source candidates were checked for accidental credential patterns. The Git ignore rules exclude signing material, dependency folders and generated working output. The reviewed signed APK is included under `releases/`; its checksum is beside it. The APK's signature is verified separately from the source tests.

## Remaining limits

No full 1.3.1 physical-phone launch, S Pen pressure/palm-rejection test, Android file-picker exercise, or live paid AI call was performed. Browser visual testing was unavailable in the local environment because Chromium could not be downloaded. Runnable Android and browser smoke tests are included.

No check establishes signing speed, stroke order from a still image, pressure technique, global signature uniqueness, or expert mastery. Those need handwritten trials and qualified review. See [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) for the remaining work and fresh-context instructions.
