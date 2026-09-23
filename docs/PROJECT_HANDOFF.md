# The Spencerian Desk — project handoff

Prepared 22 September 2026; publication verified 23 September 2026. Read this file first in a fresh development session, then inspect the current source and Git history. It records the user's goals, the implemented app, its evidence, and its remaining limits. A requirement in the conversation is not proof that the requirement has been fully achieved.

The repository is [h4cks1lv3r/Spencerian-Desk](https://github.com/h4cks1lv3r/Spencerian-Desk). The user explicitly requested review of the complete work, correction of confirmed issues, and a push to this repository for continued development. The first publication stopped after creating only `README.md` on `main` (commit `de4813cffb97d0aed46b53cb9e40f3ab0bc5dc79`). The continuation session recovered the complete unpublished 1.3.1 working tree, signed APK, and this handoff. It reran all 104 checks and independently confirmed the APK identity, certificate, alignment, and all 133 asset bytes. On 23 September, commit `9b75a6c6d930fd0ba74d15c2ce02a1ca232acad9` completed publication to `main`; all 438 remote file hashes and modes matched the intended project. The intervening README simplification in `620ea751a319bdbcae3b7149f3d3ba11a552a80f` was preserved. The saved source ZIP was still 1.3.0, so it was not used to overwrite the later work. Use the repository history for subsequent changes; the repository is authoritative over that older archive.

## 1. Product and user direction

**The Spencerian Desk** is an offline Android course and practice app. **Signature Lab** is its personal signature feature. The original product name was **Spencerian Lab**. The user rejected that name because it did not fit the refined appearance; the product was renamed in version 1.2.0 while its Android and storage identities stayed unchanged.

The user wants a complete path from the first writing exercise through advanced and expert ornamental work. Lessons must be easy to find, ordered by skill, and supported by real Spencerian models. The app must cover the 52° main slant, basic strokes, hand and arm positions, current writing tools, every lowercase letter, every capital, digits, capital construction, and flourishes. Advanced work must develop visibly beautiful writing rather than merely add more text lessons.

The intended device is a Samsung Galaxy S24 Ultra. Finger and S Pen input are useful, but paper practice remains essential. The user also wants to connect OpenAI, Claude, Gemini, or another provider to develop a personal signature from a desired name and/or a current signature image. The design should look distinctive and be practical to repeat in daily use.

The visual direction is warm white stationery, dark ink, restrained gold details, fine borders, folded corners, and clear serif headings. It should feel related to the user's other Android projects while being more classic and refined. The user referred to the 1600s and 1700s for the **interface mood**. Spencerian itself developed in the **19th century**; do not present it as a 17th- or 18th-century script.

The user repeatedly corrected the visual work. Their main concern was actual handwriting quality, not more decoration in the interface. A generic handwritten font, arbitrary curves, or a signature-like scribble does not satisfy the requirement. Paper stains, low-resolution crops, scanning defects, and whole-page snapshots are also unacceptable as lesson illustrations.

## 2. Current release and protected identities

| Item | Current value or rule |
| --- | --- |
| Product and launcher name | The Spencerian Desk |
| Signature feature | Signature Lab |
| Publication baseline | 1.3.1, Android version code 10; preserves the 1.3.0 signature design |
| Android package / namespace | `com.royal.spencerianlab` |
| Minimum / target / compile API | 26 / 36 / 36 |
| Java build | JDK 17; source compiles with Java 8 compatibility |
| Native bridge | `window.SpencerianNative` |
| IndexedDB | `SpencerianLab`, version 1, `progress` store, `state` record |
| Legacy migration key | `spencerian-lab-v1` in localStorage |
| Progress export schema | Integer version `1` |
| Stable curriculum identities | 80 lesson IDs; retain them during future edits |
| Update signing identity | Retain the existing private development certificate |

Public signing-certificate SHA-256:

```text
680e45d2c014ccb9da17e33517022f7422597585831c17c910dbe1323f36a657
```

For historical comparison, the original 1.3.0 build report records `The-Spencerian-Desk-v1.3.0.apk`, 1,357,721 bytes, and SHA-256:

```text
bc2945563100595c4f3d8aeb93afc1ea7aa330d8988a934419286462565fc454
```

The reviewed 1.3.1 APK is `releases/The-Spencerian-Desk-v1.3.1.apk`, 1,357,721 bytes, SHA-256 `989db6077220276450fae0b40a754c9fb37b08afc7122869386739396791f594`. Use `docs/signature-lab-build-verification.json` and the current release checks for this artifact. A later rebuild can have a different APK hash even when its functional source is unchanged. The historical 1.3.0 report records 133 packaged assets, exact asset-byte matches, valid v2/v3 APK signatures, valid ZIP alignment, and native DEX identical to 1.2.0. The publication audit found a confirmed storage-limit defect and implemented the 1.3.1 repair described below.

Private signing inputs are intentionally absent from public source. They are maintained separately in a private signing backup. Never commit signing keys, passwords, API keys, a user's current signature image, or progress backups. Preserve the package and certificate to install an update over the existing app. Uninstalling deletes local app data; it is not a routine update instruction.

## 3. What was requested and what exists

| User request | Implemented result | Remaining boundary |
| --- | --- | --- |
| Thorough basic-to-expert course | 80 lessons in 10 ordered modules, with objectives, teaching, drills, corrections, checks, and references | Completion is self-reported study and practice; it does not certify mastery |
| Refined classic appearance | White/ivory paper surfaces, EB Garamond headings, ink colors, gold rules, page folds, matching native presentation | Device layout and font scaling still need physical testing |
| App would not open | Reproduced and repaired native startup crash; added recovery and copied diagnostics | Full latest-release phone launch has not been verified here |
| Proper examples instead of scribbles | Focused historical models replaced the initial decorative specimen | Schematic motion templates are still distinct from actual letter exemplars |
| Clean professional images | Vector contours and reviewed redraws, clean backgrounds, attributed lesson models, zoom viewer | They are source-based studies and adaptations, not untouched historical originals |
| Examples relevant to each lesson | Every lesson maps to focused examples; the home model follows the next lesson | Continue reviewing any future prose/model changes as a pair |
| Match the selected handwriting photograph | Four direct capital studies, then a larger shared ornamental alphabet and specimen update | The photograph lacks a complete alphabet and clear small letters; not all forms are exact copies |
| Rename the app | The Spencerian Desk since 1.2.0 | Internal legacy identities deliberately remain unchanged |
| Enter a name or current signature | Local name generation; optional image import and provider-assisted name review | Image reading needs an image-capable API model; there is no local OCR |
| Stylish, practical signature options | Three distinct 1.3.0 compositions, stronger leading capitals, selectable finishes, focused finish practice | No measured signing-speed, ease, or global uniqueness guarantee |
| AI choice | Native OpenAI, Anthropic, Gemini, and custom compatible endpoint connections | Live paid requests and model compatibility require account-specific tests |
| Durable future development | Reproducible source, tests, provenance, build instructions, and this handoff | Consult actual Git history for publication state and later changes |

## 4. Curriculum and instructional decisions

The authoritative lesson data is `app/src/main/assets/curriculum.json`. It has content version 1, 10 modules, and 80 distinct lesson IDs. The atlas currently has 98 main models and 23 reference collections; these counts are not the number of all SVG files because some models use separate panels.

| Module | IDs | Count | Main content |
| --- | --- | ---: | --- |
| Start with control — Foundation | `f01`–`f08` | 8 | Baseline specimen, workspace and posture, grip, right- and left-hand setup, 52° angle, scale and practice habits |
| Principles and movement — Foundation | `m01`–`m08` | 8 | Seven-principle map, strokes and turns, loops, direct/reverse/inverted ovals, compound curve, capital stem, checkpoint |
| Small-letter families — Beginner | `l01`–`l10` | 10 | i, u, w, n, m, x, v, o, a, e, c and their related movements |
| Extended letters — Beginner | `e01`–`e08` | 8 | r, s, t, d, p, q, l, h, k, b, j, y, g, z, f; complete lowercase review |
| Words, rhythm, and numbers — Intermediate | `w01`–`w08` | 8 | Joins, spacing, rhythm, dots and crossbars, all ten digits in explicit pairs, random-number recognition |
| Complete capital alphabet — Intermediate | `c01`–`c10` | 10 | All A–Z grouped by the selected historical constructions, followed by full review |
| Shading and practical refinement — Advanced | `r01`–`r07` | 7 | Nib preparation, pressure and release, selective shades, reduced writing scale, page writing, portfolio |
| Flourishes that serve the writing — Advanced | `a01`–`a08` | 8 | Progressive ovals, entries/exits, ascenders/descenders, crossings, tangencies, hierarchy, finished phrase |
| Ornamental composition — Expert study | `x01`–`x07` | 7 | Compound curves, spirals, S-curves, stroke-order study, offhand bird construction, monograms, ornamental page, portfolio |
| Your personal signature — Expert application | `s01`–`s06` | 6 | Design brief, leading initial, design systems, optional AI critique, repeated trials, final design and maintenance |

Each lesson contains three objectives, substantive teaching/review sections, at least two drills and two mistake/fix pairs, practical self-checks, a multiple-choice question with explanation, source references, and assigned model IDs. Quiz correctness and checked practice tasks gate the completion record. The course is organized for progression; it does not claim a validated examination or qualification. The suggested first-pass lesson time is about 24 hours, not time to mastery.

Important teaching distinctions:

- **52° is measured from the horizontal baseline**, equivalent to 38° from vertical. For rise `h`, the horizontal offset is `h / tan(52°)`, about `0.781h`. This is a main form axis, not the tangent of every curve.
- The chosen 1920 ornamental source teaches a **50° main slant** and a 25° connective slant. The practice desk offers 50° ornamental and 52° classical guides. Do not silently treat them as the same measurement.
- The Compendium has a **seven-principle** map; the earlier Key has **eight principles**. The course identifies the source rather than merging their numbering without explanation.
- The Compendium's approximately 30° connective slope and the Key's 34° pointed-oval construction are source-specific statements. Neither is a universal angle for every upstroke.
- Historical grip and movement instruction does not justify painful positioning. Forearm, hand, and finger movement can work together; “the fingers never move” is not the course rule.
- Practical monoline writing is valid. Traditional ornamental shading is selective; do not turn every downstroke into a thick shade.
- On-screen pixels do not prove millimeter scale. Paper sheets specify measurable dimensions. Touch pressure is not calibrated steel-nib pressure.

`docs/curriculum-notes.md` records historical variants and assessment limits. Source references use **one-based physical PDF page numbers**, not assumed printed page numbers.

The equipment guide is in `assets/tools.json`, with dated research in `docs/research.md`. Its staged choices include a Pentel P205 0.5 mm HB pencil, a fine Uni Jetstream, Nikko G or Zebra G nibs, Leonardt Principal EF for later work, a suitable holder, smooth paper, guides, and walnut ink. These are practical stage choices, not results of a controlled “best pen” trial. Recheck current specifications and availability before changing product advice. Do not require the learner to buy every item.

## 5. Source material, reference images, and artwork history

### Original user-supplied PDFs

| Filename | Use |
| --- | --- |
| `spencerian_penmanship.pdf` | Historical Spencerian Key to Practical Penmanship; letter analysis, dimensions, faults, spacing, movement, shading |
| `New Spencerian Compendium_text.pdf` | Principal model map, practical and ornamental forms, measured alphabet, flourish construction |
| `CLASS-SpenceModule-01download.pdf` | Modern class organization and guide context; personal-use sheet layouts are not redistributed |
| `Best Pens, Pencils, Paper, and Writing Tools for Spencerian Script.pdf` | Modern equipment and practice progression; rankings are not controlled measurements |

A source checkout does not guarantee possession of all four original PDFs. Normal APK builds use the bundled reviewed assets and do not require the PDFs. Full artwork regeneration can require the original PDFs and the cached source pages. Recover the named originals from the user's retained attachments when needed; do not invent missing source pages or replace them with a vaguely similar book.

### User reference images

The first defect screenshot, `1000081436.jpg`, showed the “Your starting specimen” card with a decorative line that the user called scribbles. It is defect evidence, not a model to emulate.

The principal style target was `Screenshot_20260816_230008_Firefox.jpg`, showing “Penmanship Headquarters (Zanerian College).” The user described it as near perfect, then asked that all specimens match it. Visible features include fine connected lowercase, broad open capitals, tapered selective shades, and generous clear space. The photo alone does not establish an author, date, complete alphabet, or exact writing motion.

The later style request supplied these six references:

| Filename | Visual contribution |
| --- | --- |
| `CB-Doner-Scrapbook_0013.jpg` | Very broad ornamental capitals, dark tapered shades, surrounding curves, display-level finish |
| `Mike-Spence.png` | Pencil “Signature Design in Berlin”; open capital loops and clear flowing shape without relying on ink contrast |
| `spencerian_signatures.jpg` | Kelchner “Artistic Signatures” sheet; dominant initials balanced against a compact readable name |
| `spencerian-alphabet.webp` | Complete ornamental A–Z reference, small-letter companions, open ovals and selective shades |
| `Spencerian-Calligraphy-via-Happy-Hands-Project-6-757x1024.jpg` | The same general Zanerian letter direction as the principal photograph |
| `spency_writing_large.webp` | Ornamental verse, expressive capital hierarchy, dense display decoration |

These files guide visual judgment. They are not evidence that every elaborate design can be signed quickly, or permission to redistribute any unrelated modern worksheet. No new web photographs or paid worksheets were copied into the 1.3.0 app.

### What changed over the releases

| Release | Main change |
| --- | --- |
| 1.0 / initial app | Offline course, practice, reference, progress, and optional provider framework |
| 1.1.0 | Classic stationery theme applied across the app |
| 1.1.1 | Native startup crash reproduced and fixed; recovery screen and diagnostics added |
| 1.1.2 | Home scribble replaced by an authentic Compendium specimen; this was an intermediate crop-based solution |
| 1.1.3 | 80 lessons received focused, clean vector study examples; 94 main models and 22 collections replaced page snapshots |
| 1.1.4 | Four capital studies from the chosen photograph; 98 models, 23 collections, linked advanced lessons and AI style direction |
| 1.1.5 | 71 models rebuilt in the ornamental direction; 52 shared lowercase/capital source glyphs, refined numeral adaptations, 50°/52° choices |
| 1.2.0 | Product renamed; practical Signature Lab name/photo flow, draft selection, practice, safer name review and AI lifecycle |
| 1.3.0 | More distinct, expressive signature designs; stronger first capitals, three finishes, clearer joins, exact finish study, research-based coaching |
| 1.3.1 | Repository review repair: enforce session/concept limits before saving, protect invalid stored records, guard existing signing inputs, and add continuous verification |

The supplied Compendium's mixed-raster compression had removed fine ink. The artwork work recovered the **same scans before that compression**, not a newly photographed book, from [the earlier Compendium PDF](https://luc.devroye.org/NewSpencerianCompendium.pdf). Selected source pages and correspondence are documented in `docs/source-scan-provenance.json`.

The later alphabet uses attributed Zaner and Lupfer models from the 1920 *Lessons in Ornamental Penmanship*. The chosen photograph did not contain enough sharp lowercase material to support an exact full alphabet reconstruction. Four capital studies are directly source-guided from the photograph; other forms use clearer historical sources or identified adaptations. In 1.1.5, 71 of 98 models changed; the other 27 include separate posture, guide, construction, and retained reference studies. Do not describe every diagram as a copy of the photograph.

The shipped study SVGs contain clean vector paths and text, not embedded page photos. The production process uses conservative ink isolation, reviewed contours, fitted centerlines, selective shade reconstruction, and explicit local repairs. Ten numeral adaptations preserve historical shapes with even fine lines; they do not establish pressure history or pen order. Relevant editable inputs and provenance are kept under `tools/` and `docs/`.

The lesson home image must remain relevant to the next lesson. A beautiful advanced specimen can be shown as a destination, but it must not replace a beginner's actual target exercise. A first lesson about a baseline specimen must not imply that a beginner should reproduce an expert display piece immediately.

## 6. Signature Lab: actual implementation

### Local composer and design choices

`signature.js` exports `SignatureLab.render`, `createDrafts`, `finishStudy`, `presets`, and `buildPrompt`. It requires `zaner-glyphs.js` first. The 52 historical letter shapes are shared with course artwork; the renderer does not depend on a system script font or a network call. Digits and the supported punctuation have simpler auxiliary forms.

The composer lays out source contours, trims measured isolated lowercase tails only in the writing band, and inserts thin cubic joins at known entry/exit anchors. The source 50° forms receive the angular shear needed for the selected target, normally 52°. The original letter bodies and tall loops remain. Capital scale has a stronger effect on the first capital; later capitals are subordinate. Seeds vary bounded finish geometry; they do not create a new alphabet.

Version 1.2.0 initially produced Daily, Clear, and shortened options with modest capitals and no added flourish. The user asked for greater style. Version 1.3.0 now starts with:

| Draft | Name handling | Default treatment |
| --- | --- | --- |
| Rising finish | Full chosen name | 52°, spacing 0.94, first-capital factor 1.25, one light upward finish |
| Open oval | Full chosen name | 52°, spacing 1.02, first-capital factor 1.30, an open return below the lettering |
| Initial signature | Optional abbreviation of the first word only | 52°, spacing 0.94, first-capital factor 1.40, extended return when an exit is available |

The abbreviation preserves all subsequent words. It does not guess which words are a surname. For a one-word name it can propose a single initial. If the proposed text would be unchanged, the third draft is an Extended oval with the same text. Selection makes this an explicit user choice.

Finish values retain the existing numeric schema: `0` no added finish, `1` rising, `2` open oval, `3` extended return. Four named buttons expose these choices. The advanced controls allow slant 42–78°, spacing 0.65–1.7, finish 0–3, and capital scale 0.85–1.6. Departures from 52° are personal design choices, not new definitions of classical Spencerian.

Added finishes are continuous unshaded cubic curves. Return curves travel outside the letter envelope, including descenders. If the final form has no measured exit anchor, the composer omits the added connected finish. It does not invent a connection for an unsupported ending. “Make it flow” reuses the **exact same finish path** over pale letters. It is a movement study, not a reconstructed historical stroke-order animation.

The practice flow asks for five copied names and five from memory, with light preliminary finish practice. The selected model appears above free writing with 52° guides. This is copying practice, not tracing the actual pen sequence of the whole signature. The output is an editable design concept. Its SVG metadata and accessible description state this; new joins and spacing are not claimed as an exact original handwriting specimen.

### Names and images

Names are limited to 48 characters and need at least one supported Latin letter. The source pack covers A–Z and a–z. Limited transliteration and punctuation normalization can propose a supported spelling, but any changed spelling requires user approval before drafts are generated. Unsupported-only input, excessive length, or a missing letter pack must produce an explanation instead of an invented name. Do not silently strip accents and present the result as exact.

A current signature photo can be imported or taken from a saved drawing. Import alone makes no AI call. The image remains in session memory while moving among screens and is excluded from progress backups. Removing/replacing it changes its revision and invalidates related AI results. Native image import applies EXIF orientation, resizes the longest side to at most 1600 pixels, re-encodes JPEG, and removes metadata.

Optional AI photo reading requests a structured transcription, confidence label, features to retain, and changes to test. Confidence is the model's own estimate. The recognized name remains editable until the learner selects **Use this name**. This is provider-assisted reading, not local OCR or a verified reading. The next refinement can use the confirmed name, the current photo, and the earlier visual observations after consent.

### AI connection and response handling

| Provider | Implemented native request |
| --- | --- |
| OpenAI | `POST https://api.openai.com/v1/chat/completions` |
| Anthropic | `POST https://api.anthropic.com/v1/messages` |
| Gemini | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| Custom | User-selected HTTPS OpenAI-compatible endpoint ending in `/chat/completions` |

The model ID is editable and account-specific. The current OpenAI implementation uses **Chat Completions**, even though the earlier research document discusses the Responses API as an option. Do not document a proposed API as already implemented. Consumer ChatGPT/Claude/Gemini subscriptions do not supply API credentials or automatically pay API charges. The app also offers **Copy prompt for chat app** for manual use.

Keys and provider settings are encrypted with AES-GCM using Android Keystore. Keys do not return to JavaScript and do not enter IndexedDB or exports. Each native send action shows the selected provider/model, whether an image is included, and the possible charge. There is no automatic fallback to another paid provider. Requests use the saved model configuration. Changing a custom endpoint requires an explicitly entered key; redirects and cleartext requests are blocked.

AI design replies can provide text plus three bounded parameter sets. Applicable designs must retain slant 52°, spacing 0.85–1.15, integer finish 0–3, and capital scale 0.85–1.4, with valid names and seeds. App-side validation controls application; returned SVG, HTML, or JavaScript is never executed. Responses outside the supported structure are shown as plain text, not forced into a fabricated preview.

The pending request stores its ID, purpose, photo revision, selected and desired name, provider, brief, and goal. Changes invalidate stale requests and results. A late result cannot apply to a different name or photo. Photo reading, design, critique, and drills have distinct UI behavior. Restore clears stale image/design/AI context and uses the restored state.

Research for 1.3.0 is in `docs/signature-style-research.md`, with links to Logos Calligraphy, Loveleigh Loops, and David Grimes. It supports fine lowercase, a dominant capital, open oval space, clear crossings, and repeated practice. It does not validate the generated compositions. A still image cannot establish actual speed, grip, pressure, pen lifts, or motion. Do not advertise globally unique, legally validated, forgery-proof, or teacher-certified signatures.

## 7. App architecture and durable file map

The app is a native Java Android shell around bundled HTML/CSS/JavaScript. There is no React build, hosted backend, account service, or required network connection for lessons.

| Path | Responsibility |
| --- | --- |
| `app/src/main/AndroidManifest.xml`, `app/build.gradle`, `build_apk.py` | Package/version/API metadata and builds; keep version values aligned |
| `app/src/main/java/com/royal/spencerianlab/MainActivity.java` | WebView lifecycle, asset origin, native bridge, consent and events |
| `StartupRecovery.java` in the same directory | Native retry screen and bounded copied startup details |
| `AiClient.java` | Provider request construction, endpoint validation, response parsing and errors |
| `SecureProviderStore.java` | Android Keystore protected provider settings |
| `FileTransfer.java` | Native image import, backup import, and file export boundaries |
| `app/src/main/assets/index.html` | Offline entrypoint and script load order |
| `assets/app.js` | Routes, lessons, signature workflow, AI lifecycle, backup validation and progress UI |
| `assets/style.css`, `assets/fonts/` | White paper theme and bundled EB Garamond/OFL license |
| `assets/storage.js` | Queued atomic IndexedDB persistence and database opening |
| `assets/practice.js` | Pointer drawing, schematic templates, angle guides, playback, exports and metrics |
| `assets/signature.js`, `assets/zaner-glyphs.js` | Trusted signature composer and generated source glyph pack |
| `assets/curriculum.json`, `assets/atlas.json`, `assets/tools.json` | Course, model/collection/source mappings, dated equipment guide |
| `assets/examples/` | Reviewed app SVG study assets |
| `tools/lesson-examples.json`, `tools/atlas-collections.json` | Source selections, coordinates, repairs and collection definitions |
| `tools/source-tracings/`, `tools/style-specimens/`, `tools/style-glyphs/` | Editable vector sources and reviewed replacement models |
| `tools/ornamental-glyphs.json`, `tools/ornamental-style.json` | Portable glyph source and 71-model replacement manifest |
| `tools/reference-style.json`, `tools/reference-inputs/`, `tools/source-pages/` | Reference mapping and retained reproduction inputs, outside the APK |
| `tools/build_examples.py`, `tools/register_reference_style.py`, `tools/apply_ornamental_style.py` | Artwork registration and regeneration |
| `tools/render_signature_preview.cjs` | Actual composer specimen and geometry review sheets via Resvg |
| `tests/dom/`, `tests/signature/`, `tools/tests/`, `tests/native/`, `tests/android/` | DOM, renderer, geometry/browser, Java boundary, and Android launch checks |
| `.github/workflows/verify.yml` | CI checks and a test APK built with a separate temporary signing identity |
| `releases/` | Maintainer-signed APK and checksum for the publication baseline |
| `docs/` | Research, provenance, release evidence, historical repair reports, and this handoff |

The WebView loads the intercepted bundled origin `https://appassets.androidplatform.net/assets/index.html`. It does not fetch its interface from that host. Other resource origins and unsafe URL schemes are blocked; HTTPS source links open externally. The bridge contract is documented in `README-native.md`. Native callbacks include `native-ai-result`, `native-image`, `native-export`, `native-import`, and `native-back`.

Progress includes completions, bookmarks, notes, quizzes, sessions, daily goal, handedness, the selected signature parameters, and saved signature concepts. Backup validation is bounded and checks known lesson IDs before replacement. Exported drawings belong to sessions; exporting and then saving the same desk session updates the record rather than double-counting it. Reported minutes are elapsed desk-session time, not measured active pen contact. AI replies and imported photo context are not durable session records unless an applied concept is saved.

### 1.3.1 persistence repair

The publication review found that earlier runtime save paths could exceed limits already imposed by backup validation: 2,000 sessions or 1,000 saved concepts. On reopening, such a record failed validation and the app showed defaults. A later normal save could replace the rejected record. This was a confirmed data-loss risk, not merely a possible future concern.

Version 1.3.1 checks collection capacity before adding a paper session, a new digital session, or a saved signature. Reaching the limit shows the need to export a backup and delete an old record; it does not silently discard old records. Updating the same existing digital session remains allowed at capacity. A save also checks overall state validity before writing.

If stored IndexedDB or legacy data is invalid, the app retains the original record and displays **Saved progress needs recovery**. Ordinary writes are blocked. **Export recovery data** exports the rejected original data, including malformed legacy text, for later repair. **Restore progress** requires an explicit valid backup and successful storage write before recovery mode ends. A failed restore preserves the old data and protection. This is not automatic repair of every malformed backup; a record that exceeds the supported limits still needs a deliberate, reviewed repair before normal restore.

There is no cloud sync, cross-device account, automatic updater, local signature OCR, handwriting recognition engine, calibrated pressure grading, or complete verified stroke-order alphabet. Do not imply these exist because adjacent UI features are present.

## 8. Build, regeneration, and checks

Normal Android builds need Python 3, JDK 17 (`java` and `keytool` on PATH), Android SDK platform 36, and build-tools 36.0.0. The manual path has no Maven or Gradle download dependency:

```sh
python3 build_apk.py --sdk /absolute/path/to/android-sdk
```

This compiles resources, Java, and DEX; aligns and signs the APK; verifies signatures/alignment; and writes the APK and checksum to `output/`. A standard Gradle project is also supplied for Gradle 8.13 / Android Gradle Plugin 8.11.1. No Gradle wrapper binary is bundled. For releases, align version name/code in the manifest, app Gradle file, and manual builder. A fresh source checkout without the private signing identity creates a new development identity; that APK cannot replace an existing installation signed with the original certificate.

For a maintainer release, restore the complete original private signing pair and require it explicitly:

```sh
python3 build_apk.py --sdk /absolute/path/to/android-sdk --require-existing-signing
```

The 1.3.1 build preflight rejects a partial signing pair or invalid configuration before compiling or replacing output. The release flag also rejects a missing pair. It must never silently replace a missing keystore when its password/configuration file remains. A personal development build without the flag can generate a new identity only when both original files are absent. Eight Python tests exercise these boundaries without printing their password sentinel.

Focused test commands, from the repository root:

```sh
npm --prefix tests/dom ci --ignore-scripts
npm --prefix tests/dom test
node --test tests/signature/source-render.test.cjs
node --test tools/tests/practice_geometry.test.js
python3 -m unittest discover -s tools/tests -p '*_test.py'
sh tests/native/run.sh /absolute/path/to/android-sdk
```

DOM tests require Node.js 20.19+ and the pinned `jsdom` and `fake-indexeddb` dependencies. Native boundary tests use the Android platform JAR. They do not make paid provider calls.

The GitHub Actions workflow runs on pushes to `main`, pull requests, and manual dispatch. It installs the pinned test dependencies and required SDK, runs the 104 checks, and builds a temporary CI APK. The workflow deliberately has no original signing secret. Its downloadable test APK cannot update the maintainer-signed installed app. Use the maintainer-signed artifact for an in-place update; a green CI build is not evidence of a phone launch or live AI request. The first remote run passed the DOM, renderer, geometry, and signing checks, then failed because `sdkmanager` was absent from PATH. The workflow now invokes the executable at its documented absolute location beneath `ANDROID_HOME`. Check the [Actions history](https://github.com/h4cks1lv3r/Spencerian-Desk/actions/workflows/verify.yml) for the result on the current commit.

Optional real-browser check, only where Chromium is already available or can be installed normally:

```sh
node tools/tests/signature_browser_smoke.cjs
```

It supports `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE`. It checks mobile/desktop routes, three previews, selection, save, practice, persistence, overflow and console errors, and writes screenshots. This environment's Chromium download was blocked; no browser pass was claimed. Do not treat a blocked browser download as app failure or evade an environment restriction.

Actual Android launch check, with an authorized, unlocked device already connected:

```sh
python3 tests/android/launch_smoke.py output/The-Spencerian-Desk-v1.3.1.apk --sdk /absolute/path/to/android-sdk --timeout 180
```

The gate installs with `-r`, starts the real launcher Activity, and requires visible loaded-home content plus stable operation. A blank WebView, splash screen, or native recovery page cannot pass. See `tests/android/README.md` for serial selection and evidence files. This gate does not prove the full app workflow.

To register the already reviewed ornamental vectors and regenerate the glyph JS:

```sh
python3 tools/apply_ornamental_style.py
```

To rebuild the full original example pipeline, obtain the named PDFs and install PyMuPDF, Pillow, NumPy, SciPy, and `potrace`:

```sh
python3 tools/build_examples.py --pdf-dir /path/to/supplied/pdfs
```

Do not regenerate reviewed artwork casually: compare resulting forms and provenance before accepting changes. `tools/register_reference_style.py` restores the reviewed selected-photo studies. The full pipeline applies the later ornamental update after its original models.

For the current signature review sheets, install `@resvg/resvg-js` locally or point to an existing installation:

```sh
RESVG_MODULE=/path/to/@resvg/resvg-js node tools/render_signature_preview.cjs
```

The default example is Reuben Royal; a different name can be passed as the final argument. It also renders six other names to check varying lengths, capitals and descenders. These are specimen sheets, **not screenshots of an Android screen**. Use Resvg or a correct browser for this composer: earlier MuPDF SVG output misrendered currentColor/clipping and falsely appeared to have overlapping tails.

## 9. Verification: what is established and what is not

The 1.3.0 release originally ran 45 focused tests: 36 DOM integration and 9 signature renderer checks. Before the storage repair, the repository review reran those plus 17 practice-geometry and 29 native boundary checks: 91 checks passed. The final 1.3.1 review passed **104 automated checks**: 41 DOM, 9 renderer, 17 practice geometry, 29 native boundary, and 8 signing-preflight checks.

Coverage includes data and routes, all lesson references, name preservation, draft distinction, saved settings and restore, bounded AI settings, stale replies, photo consent with mocks, finish availability, matching preview/study paths, and curve bounds. Five new DOM cases cover paper capacity, digital capacity and same-record update, signature capacity, invalid-record recovery, and legacy migration/recovery. The signing checks cover partial/missing/invalid private inputs and fail before build mutation. Consult current release verification for artifact evidence. Test count alone does not prove a good-looking or comfortable signature.

The draft sheet, highlighted finish study, and six additional name compositions were rendered from actual app output and visually inspected in the 1.3.0 work. A second curve revision improved return shape and visibility. APK evidence establishes packaging, asset correspondence, certificate continuity, and unchanged native DEX from 1.2.0.

The startup history requires precise wording. Version 1.1.0 crashed on an Android 15/API 35 emulator because `PhoneWindow.getInsetsController` was called before its DecorView existed. Version 1.1.1 moved the call after `setContentView(web)` and passed that crash point. A native recovery screen handles startup exceptions and renderer loss without clearing progress or provider settings. Diagnostics are bounded and copied only on user action.

The same emulator then lost its WebView renderer. An independent minimal WebView control also failed, so the environment could not validate a complete app home render. That is evidence for the original crash fix, not evidence of a successful latest-release launch. Recovery also cannot catch every OS process termination or native host crash.

Still unverified for the current release:

- Installation and complete launch on a physical Samsung S24 Ultra, including update with real existing records.
- Actual mobile layout, scrolling, keyboard obstruction, orientation changes, Android font scaling, and accessibility behavior.
- S Pen pressure, touch rejection, drawing latency, and comfort at real writing scale.
- Native file pickers through cancellation, rotation, backgrounding and successful import/export on a phone.
- Live authenticated OpenAI, Claude, Gemini, or custom provider requests, image reading quality, and billing behavior.
- Reliable visual grading, historical correctness of every generated join, inferred pen order, uniqueness, or signing-speed performance.

`docs/startup-repair-verification.md` and `docs/runtime/` retain historical failures. Do not delete inconvenient evidence or silently relabel an old check as a current pass.

## 10. Continuation rules and prioritized next work

Preserve the following unless the user deliberately changes the goal:

1. The product name, light folded-paper theme, and Signature Lab feature name.
2. Package, bridge, database, record keys, certificate, and stable lesson IDs. A display rename must not erase progress.
3. Precise angle definitions and the 50° source/52° course distinction.
4. Genuine source forms, readable letter models, explicit adaptations, source/page attribution, and clean vector assets.
5. Lesson-specific examples and the beginner-to-expert learning order.
6. Deliberate spelling review, optional photo handling, explicit provider consent, bounded AI application, and stale-result protection.
7. Honest limits: a polished SVG is not a writing-speed trial, full pen-motion reconstruction, or uniqueness certificate.
8. Offline lessons and practice. AI should remain optional.

Prioritize future work by actual risk and user value:

| Priority | Work | Evidence needed before calling it complete |
| --- | --- | --- |
| 1 | Phone acceptance test of the current signed APK | In-place update, loaded home, lesson path, signature creation/save/reload, practice, file transfers, screenshots and logs |
| 2 | Live provider compatibility | One text and one image request per supported provider/model used by the user; cancellation/error handling and key retention checks |
| 3 | Handwritten signature trials | Writer-produced repeated samples, elapsed signing trials when useful, comfort notes, and retained failed attempts; no fabricated speed scores |
| 4 | Expert review of lettering and connections | A qualified Spencerian/ornamental penman reviews form, joins, spacing, capital balance, and actual physical execution |
| 5 | Broader name support | Deliberately sourced diacritics and extra glyphs, explicit spelling preservation, tested bounds and fallback review; no silent substitution |
| 6 | Better motion instruction | Verified stroke-order records or demonstrations, separate from outline contours; progressive letter-family and flourish exercises |
| 7 | Practice comparison | Before/after paper specimens, side-by-side review, user-recorded repeatability, and simple exports with clear metric limits |
| 8 | Maintainable growth | Small modules extracted from `app.js`, confirmed remote CI runs, documented release steps, updated dated equipment/provider research, controlled content revisions |

Cloud sync, OCR, distribution through a store, auto-update infrastructure, or a server for shared credentials are separate design projects. Define the need before adding them. Do not replace the source-based composer with generated raster signatures or a decorative font simply to produce more dramatic previews.

## 11. Fresh-chat starter prompt

Copy this into a new development conversation with access to the repository:

> Continue The Spencerian Desk at https://github.com/h4cks1lv3r/Spencerian-Desk. Read `docs/PROJECT_HANDOFF.md`, the current README files, release verification, and current Git history before editing. The handoff publication baseline is Android version 1.3.1/code 10: 80 lessons, clean source-based Spencerian specimens, a white folded-paper theme, and Signature Lab with typed-name generation, optional consent-based photo review, three expressive finishes, saved concepts, and practice. The repository audit also repaired storage capacity and invalid-record recovery. Preserve `com.royal.spencerianlab`, the native bridge/storage identities, all lesson IDs, and the existing signing certificate. Signing secrets are private and must never enter Git. Preserve the distinction between classical 52° and the ornamental source's 50°. Do not claim exact photo copying, signing speed, uniqueness, verified pen order, physical-phone testing, or live-provider testing without evidence. Inspect the actual current state, implement the requested next change, run relevant checks, review real vector output, and update the handoff and release evidence. Ask for missing private build inputs only when required; do not invent them. My next requested change is: [insert task].
