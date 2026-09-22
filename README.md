# The Spencerian Desk

An offline Android course and practice desk for Spencerian penmanship, with Signature Lab for personal signature concepts.

**Current release: 1.3.1 / code 10.** [Download the signed APK](releases/The-Spencerian-Desk-v1.3.1.apk?raw=true). 

## Install

1. Download `releases/The-Spencerian-Desk-v1.3.1.apk` to your Android phone.
2. Open the APK. If Android asks, allow this install from the app you used to open it.
3. Open **The Spencerian Desk** and select **Continue learning**.

Requires Android 8.0 or later. The package targets Android 16. This is a development build for user testing, not a Play Store release. No account is needed for the course.

## Update from an earlier version

Install the new APK over the previous app. Version 1.3.1 uses the same Android package and signing certificate, so it is eligible for an in-place update. Do not uninstall first. Existing local progress remains under the same app identity.

If the native startup recovery screen appears, select **Try again**. If it remains, select **Copy startup details** and include that text in the issue report. Details stay on the device until you choose to share them. Retrying does not clear saved progress or provider settings.

## Course

80 original lessons in 10 ordered modules cover posture, right- and left-hand setup, 52° slant from the horizontal baseline, seven Compendium principles, all lowercase and capital letters, all digits, spacing, joins, selective shading, flourishes, ornamental projects, and personal signatures.

Each lesson has objectives, teaching text, drills, common errors and corrections, a knowledge check, a practical checklist, source-page references, and matching source models. The atlas contains 23 focused reference collections, including the chosen handwriting reference. The first-pass suggested lesson time totals about 24 hours; this is not a claim about time to mastery.

Knowledge checks and practical self-checks record completion. They do not certify skill. Advanced and expert labels describe course content. Learners should repeatedly compare uncorrected paper specimens with the original forms.

## Practice

- Schematic animated stroke demonstrations, numbered starts, adjustable playback and trace opacity.
- Digital drawing with touch, mouse, or pen Pointer Events; a pen-only mode is available.
- Selectable 50° ornamental and 52° classical guideline geometry, movement guides, and 3:2 letter guides.
- Device-reported pen pressure when available; this does not reproduce or calibrate metal-nib flex.
- Approximate angle estimates for long, nearly straight descending strokes. Curves and short strokes are excluded. This is geometry, not AI grading.
- Free writing, undo, clearing, PNG export, printable A4 SVG sheets at a 3 mm x-height or larger movement scale.
- Session journal, paper-practice logs, self-ratings, lesson notes, saved lessons, and course progress.

The digital templates are movement studies, not exact alphabet tracings. Use the historical atlas for actual letter construction. Physical paper practice is necessary to learn grip, friction, nib alignment, pressure, and real writing scale.

## Signature Lab and AI

Signature Lab accepts a desired name and creates three local drafts: Rising finish, Open oval, and an optional Initial signature. The drafts use a consistent 52° slant, a prominent leading capital, fine lowercase forms, and one considered finish. Each draft remains editable. The Make it flow view highlights the exact added curve against pale lettering; it does not invent a finish when an ending has no measured connection point. Choose a draft and practise with the selected model beside the writing desk. Quick signing is a design goal, not a measured result; test the chosen form with repeated pen-and-paper signing.

The local composer uses the same 52 source-derived lowercase and capital shapes used by the lessons. Slant, spacing, capital size, and finishing curves remain editable. Saved concepts and SVG exports use the same renderer. New joins and spacing are design choices, so a composed name is not an exact photograph copy or a verified pen-written specimen. Digits and punctuation use simple auxiliary forms. Concepts are not guaranteed globally unique.

A current signature photo is optional. The app can ask the selected AI provider to read it and suggest a simpler design. Review the recognized name before generating drafts. Importing a photo alone does not send it to a provider.
Optional native API connections support:

- OpenAI through Chat Completions-compatible models.
- Anthropic Claude through the Messages API.
- Google Gemini through generateContent.
- A custom HTTPS OpenAI-compatible Chat Completions endpoint.

In **More → Settings & AI**, choose a provider, enter a model supported by your account, and enter your API key. Consumer subscriptions do not automatically cover API usage. The app does not sign in to ChatGPT, Claude, or Gemini consumer accounts. Keys are encrypted with Android Keystore, never returned to JavaScript, and excluded from progress exports.

The signature coach accepts a design brief and an optional writing image. Importing an image does not send it. Before each request, the app identifies the provider, model, and whether an image is included. AI design responses can supply checked numeric parameters for three editable concept previews; responses that do not match the format are shown as plain text. AI can offer drills and visual critique but cannot verify movement from a still image, guarantee uniqueness, authenticate handwriting, or certify mastery.

The **Copy prompt for chat app** option allows manual use with an existing consumer chat subscription.

## Data and backup

Progress and drawings are stored on the device in IndexedDB. **More → Settings → Export backup** exports your records to JSON; restore validates the entire state before replacement. A failed write reports an error. Do not uninstall or change devices without exporting first. Android cloud backup is disabled to keep provider credentials out of automatic backups.

Exporting from the practice desk records one session; saving that same session again updates it instead of adding its time twice. Minutes are elapsed desk-session time, not a calibrated measure of active writing. API feedback is kept in the current session; save an applied concept to preserve its design.

The app supports up to 2,000 practice sessions and 1,000 saved concepts. At a limit, export a backup and delete selected old records before adding more. Records are never silently trimmed. Version 1.3.1 also blocks ordinary writes when existing saved data fails validation. A persistent recovery notice offers an exact export of that stored record and access to backup tools. Only an explicitly confirmed valid restore can replace it. Large drawings can reach device storage or the native 40 MB transfer limit before the record-count limits.

The private development signing identity is excluded from this source archive and retained separately in `Spencerian-Lab-Signing-Backup.zip`. Keep that file private. The same identity is required for future APK updates without uninstalling. See `README-native.md` for the native bridge, limits, and build details.

## Build

With JDK 17 and Android SDK platform 36 / build-tools 36.0.0 installed:

```bash
python3 build_apk.py --sdk /absolute/path/to/android-sdk
```

A standard Gradle project is also provided. It requires Gradle 8.13 / Android Gradle Plugin 8.11.1; no Gradle wrapper binary is bundled. Source-only builds create a new development signing key unless the separate original signing identity is restored.

For an update to the maintainer-signed APK, privately restore both original files in `.local-signing/` and use `python3 build_apk.py --sdk /absolute/path/to/android-sdk --require-existing-signing`. An incomplete signing pair now stops the build before compilation. Never commit signing keys, the password file, provider credentials, or signing backups. Preserve the package and increase the version code for each distributed update.

The GitHub workflow runs DOM, signature, practice, signing-preflight and native checks, then compiles an APK with a temporary CI signing identity. That CI artifact cannot update the maintainer-signed app. Use the APK in `releases/` for the current update.

To run the automated tests locally:

```sh
npm ci --ignore-scripts --prefix tests/dom
node --test tests/dom/app.integration.test.cjs
node --test tests/signature/source-render.test.cjs
node --test tools/tests/practice_geometry.test.js
python3 -m unittest discover -s tools/tests -p '*_test.py'
sh tests/native/run.sh /absolute/path/to/android-sdk
```

## Sources and rights

The four user-supplied PDFs informed the course. The expanded specimen set also uses the high-resolution 1920 Lessons in Ornamental Penmanship, with Zaner and Lupfer models attributed by page. Teaching prose and drills are original paraphrases and instructional design. Modern personal-use handout pages are not redistributed. Clean study reproductions retain source attribution in `atlas.json`, with image-selection and restoration details in `docs/example-artwork.md`. Source references use physical PDF page numbers.

The bundled EB Garamond font is redistributed under the SIL Open Font License; see `app/src/main/assets/fonts/OFL.txt`.

See `docs/curriculum-notes.md` for the historical seven/eight-principle distinction and source mapping, and `docs/research.md` for current materials and provider API research.

## Verification limits

See `docs/ornamental-style-verification.md` for the historical artwork and renderer scope, and [docs/verification.md](docs/verification.md) for current checks and the exact APK hash. Native Java is unchanged from 1.2.0. A physical Samsung S24 Ultra, S Pen pressure/palm rejection, file pickers, and live paid AI calls require device testing. Earlier emulator results remain historical evidence and do not validate this release's full interface. DOM tests do not render Android pixels.

## Rebuild the study artwork

The APK contains clean SVG contours and source-guided vector redraws, not embedded page photos. Reviewed editable redraws are retained under `tools/source-tracings/` and copied by the builder. Model selections and exact source coordinates are in `tools/lesson-examples.json`; reference groups are in `tools/atlas-collections.json`. The original Compendium JPEG page inputs needed for reproduction are retained under `tools/source-pages/`, outside the Android assets. Their verified provenance is in `docs/source-scan-provenance.json`.

With Python packages PyMuPDF, Pillow, numpy and scipy, plus the `potrace` executable, run:

```sh
python3 tools/build_examples.py --pdf-dir /path/to/the/supplied/pdfs
```

The original supplied `spencerian_penmanship.pdf` is required for its selected models. The optional `--original-compendium /path/to/NewSpencerianCompendium-original.pdf` can restore cached Compendium page inputs. That exact earlier copy of the same scans is available at https://luc.devroye.org/NewSpencerianCompendium.pdf. See `docs/example-artwork.md` for restoration and inspection details.

The selected photograph is retained only as a reproduction input under `tools/reference-inputs/`; it is not an APK page image. `tools/reference-style.json` records its cleaned studies, lesson mappings, and coaching direction. `tools/register_reference_style.py` can register those reviewed vectors independently and also runs after the main artwork builder. AI receives the style description through the existing consent flow; the reference photograph is not attached automatically.


## Rebuild the ornamental specimen update

The 71 reviewed replacement SVGs are stored in `tools/style-specimens/`, with their sources and adaptations in `tools/ornamental-style.json`. The 52 shared source glyphs are stored in `tools/ornamental-glyphs.json`. To register the reviewed models and regenerate the JavaScript glyph pack without downloading source books:

```sh
python3 tools/apply_ornamental_style.py
```

This writes the current atlas models and `app/src/main/assets/zaner-glyphs.js`. The main artwork builder applies this update after its original book models. Fine-line numeral adaptations retain their original source identities; posture, exact guide diagrams, and bird construction studies remain distinct instructional material. Do not describe those retained diagrams as copies of the photograph.

To make the white specimen preview, install `rsvg-convert` and Node.js, then run:

```sh
python3 tools/render_reference_preview.py
```

The preview uses the app’s actual specimen SVGs and signature renderer. It is a presentation sheet, not a device screenshot.

For the current Signature Lab comparison, install `@resvg/resvg-js`, then run `RESVG_MODULE=/path/to/@resvg/resvg-js node tools/render_signature_preview.cjs`.

## Continue development

Read [PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md) for the full request history, architecture, state contracts, exact build and test steps, design limits, and ranked roadmap. The current APK and checksum are retained in `releases/`. Generated working output, dependencies, SDK files and private signing material are excluded from Git. The repository is the source of truth for future changes.
