# Release verification — The Spencerian Desk 1.4.0

This release implements the confirmed repairs from the 23 September 2026 review of version 1.3.1. The item-by-item response, scope decisions, and pending device acceptance checks are in [audit-response-v1.4.0.md](audit-response-v1.4.0.md). The previous report is retained in [archive/release-verification-v1.3.1.md](archive/release-verification-v1.3.1.md).

## Verified package

| Item | Result |
| --- | --- |
| APK | `releases/The-Spencerian-Desk-v1.4.0.apk` |
| Version | 1.4.0 / code 11 |
| Package / label | `com.royal.spencerianlab` / The Spencerian Desk |
| Android | Minimum API 26, target and compile API 36 |
| Bytes | 1,378,431 |
| SHA-256 | `a6c4f8421b0e6186a9b9f3989a9a05a461e8985c5e41e5a401340b49db15eeff` |
| Certificate SHA-256 | `680e45d2c014ccb9da17e33517022f7422597585831c17c910dbe1323f36a657` |
| APK signatures | v2 and v3 verified with `apksigner` |
| Alignment | `zipalign -c -P 16 4` passed |
| Integrity / assets | ZIP integrity passed; all 134 bundled asset files match source bytes |

The release was built with the existing private signing pair. The unchanged certificate/package and increasing version code make it eligible to update the previous install. A real phone update was not performed here. Optional v4 sidecar generation is explicitly disabled; no sidecar is required to install the APK. Machine-readable evidence is in [release-v1.4.0.json](release-v1.4.0.json).

## Automated checks

**193 checks passed locally.**

| Suite | Checks | Evidence and scope |
| --- | ---: | --- |
| App integration | 47 | Existing course, signature, consent, storage protection and backup flows; Clear starts a new saved drawing session, lazy journal pages, batched typing, Android bridge chunk export above 40 MB, atomic streamed restore, canceled/truncated import, exact Unicode recovery export |
| Audit UI | 16 | History/focus/headings, draft recovery and stale-draft removal, explicit erase, failed-delete rollback, duplicate-ID delete targeting, viewport-only drawing loads, truthful storage-failure notice, AI cancel/truncation, restore cancellation races, preserved large runtime strokes, rejected malformed stored drafts |
| Backup codec | 11 | Above-40 MB stream, one-character/Unicode boundaries, old JSON, duplicate/missing/invalid images, incomplete footer, chunk/record bounds, cancellation during staging, refusal to export corrupt drawings |
| Storage | 10 | Atomic v1 migration, protected invalid records, lazy references, no unchanged-image rewrites, failed transactions, staged imports, interrupted cleanup, erase and duplicate session IDs |
| Signature renderer | 9 | Source contours, spelling protection, bounds, variations and finish consistency |
| Practice geometry | 17 | Movement/letter guides, target angles, print geometry, transformation and animation calculations |
| Native boundaries | 29 | Provider and file-transfer pure helper boundaries |
| AI transport | 19 | Cancellation tokens/races and provider/local truncation decisions |
| Bounded file transfer | 27 | More than 40 MB, exact Unicode/UTF-8, malformed bytes, limits, closure, stalled provider streams, integer overflow and full journal bound |
| Signing preflight | 8 | Missing, partial and invalid signing inputs cannot silently replace an identity |

DOM checks use jsdom, fake IndexedDB, and simulated canvas/native callbacks. The native tests run pure Java helpers; the Android SDK JSON implementation is a stub in those tests, so live provider response parsing is not established by their passes. Compilation verifies integration of all Java files against API 36.

The file-transfer suite passes with `java -Xmx32m`, copying/reading a 50,000,001-byte synthetic stream. This demonstrates bounded helper memory, not a measured Android WebView memory profile. The storage regression fixture uses approximately 19 MB of drawings and 30 queued metadata edits: zero image writes occur, and serialized metadata stays below 1.5 MB total. The UI exporter regression streams 220 synthetic drawings totaling more than 40 MB in chunks no larger than 192 KiB. These are reproducible regression assertions, not a new phone/browser speed benchmark.

Run the suites with:

```sh
npm ci --ignore-scripts --prefix tests/dom
node --test tests/dom/*.test.cjs
node --test tests/signature/source-render.test.cjs
node --test tools/tests/practice_geometry.test.js
python3 -m unittest discover -s tools/tests -p '*_test.py'
sh tests/native/run.sh /absolute/path/to/android-sdk
sh tests/native/run-transfer.sh
python3 build_apk.py --sdk /absolute/path/to/android-sdk --require-existing-signing
```

The GitHub workflow runs these suites and a clean build using a temporary CI signing identity. Its APK cannot update the maintainer-signed installation. Consult the [workflow history](https://github.com/h4cks1lv3r/Spencerian-Desk/actions/workflows/verify.yml) for remote results.

## Limits and remaining acceptance work

No physical Android device/emulator, S Pen test, real Android file picker, live paid AI call, or actual browser rendering pass was available. Playwright is installed, but Chromium launch failed because its executable is absent. The native layout/keyboard and lifecycle fixes are source-reviewed and compile-tested; that does not prove their behavior on every API level or document provider. The audit response includes a concrete API 26/30/33/35/36 manual matrix.

Imported photos and AI responses remain transient. The bounded vector draft can restore navigation and drawing after interruption; a warning asks the user to save when the recovery draft exceeds its limits. Streaming backups still need enough local staging space and destination capacity. New JSONL backups require version 1.4.0 or newer; validated legacy schema-1 JSON remains accepted up to 40 MB. The 32 GiB native streaming guard covers the existing 2,000-record, per-image schema limits. Browser-only preview downloads remain capped at 40 MB.

No test certifies handwriting quality, speed, identity, universal stroke order, Play policy compliance, or a production privacy-policy review. Optional dark mode, translation, multi-turn/streamed AI conversation and Play distribution remain separate product decisions.
