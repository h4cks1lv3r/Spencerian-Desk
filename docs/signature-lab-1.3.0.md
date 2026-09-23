# The Spencerian Desk · Signature Lab · 1.3.0

This release adds more expressive signature compositions while retaining the white paper design and the existing course.

## Changes

- Three starting designs now have different outlines: **Rising finish**, **Open oval**, and **Initial signature**. The last is an optional abbreviation of the first word only; the remaining name is preserved.
- The leading capital has more presence. Later capitals stay smaller so the name has a clear visual hierarchy. Letter contours remain from the bundled historical source set.
- Joins slightly overlap the trimmed source hairlines to reduce visible gaps. Added finishes use continuous cubic curves; oval turns pass to the right of the letters and return below the complete letter envelope.
- Four named finish buttons select no added finish, rising finish, open oval, or extended return. The existing sliders and saved controls remain compatible.
- **Make it flow** highlights the actual added curve against pale lettering and gives a short practice sequence. Endings without a measured exit point show letter practice instead of an invented connection.
- AI guidance now requests prominent capitals, fine lowercase, clear spaces, and an intentional finish. Applicable concepts must retain 52°, spacing 0.85–1.15, finish 0–3, and capital scale 0.85–1.4. Returned SVG or code is not executed.
- The app links the instructor sources used for these changes. See [the research notes](signature-style-research.md) for the evidence and design decisions.

The name-review, optional photo-reading, consent, stale-result protection, SVG export, and backup behavior from 1.2.0 remain in place. Photos are not automatically sent to an AI provider.

## Verification

45 focused automated checks passed: 36 DOM integration tests and 9 renderer tests. Coverage includes exact name preservation, distinct drafts, saved settings, bounded AI results, finish controls, missing exit anchors, matching preview and study paths, and complete curve bounds. Test providers are mocked; this is not a live-provider test.

The three example drafts, finish study, and six additional names were rendered with Resvg from the actual app composer and inspected. The review prompted a second curve revision to improve the return shape and line visibility. The preview sheet is a rendered specimen sheet, not a phone screenshot.

The build report in `signature-lab-build-verification.json` records APK identity, signature, alignment, asset hashes, and native-code comparison. Version 1.3.0 uses code 9 and the existing package and certificate so it can update the installed app.

Browser visual testing could not run because this environment could not download Chromium. The mobile and desktop smoke-test script remains available in `tools/tests/signature_browser_smoke.cjs`. No physical-phone launch, stylus behavior, or live AI response was verified for this release.

Signing speed and ease require handwritten trials. The app does not infer them from a preview, certify a stroke order, or guarantee uniqueness.

## Reproduce

```sh
cd tests/dom
node --test app.integration.test.cjs
cd ../..
node --test tests/signature/source-render.test.cjs
RESVG_MODULE=/path/to/@resvg/resvg-js node tools/render_signature_preview.cjs
python3 build_apk.py --sdk /path/to/android-sdk
```

The build needs Android SDK 36, build-tools 36.0.0, and JDK 17. Signing material is private and is excluded from the shared source archive.
