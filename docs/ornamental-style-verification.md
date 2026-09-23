# Ornamental specimen update · version 1.1.5

## Scope

The update rebuilds 71 of the 98 atlas examples. All 80 lesson IDs remain in place. The local signature composer uses 52 shared source glyphs: the complete lowercase and capital Latin alphabet. The app keeps the existing white folded-paper presentation.

| Rebuilt model group | Count |
| --- | ---: |
| Individual and grouped lowercase studies | 28 |
| Connected writing and signature specimens | 21 |
| Complete capital-family models | 10 |
| Ornamental studies | 2 |
| Fine-line numeral adaptations | 10 |
| Total | 71 |

The other 27 examples include retained instructional diagrams and the four direct capital studies from the chosen photograph. Posture, exact guide geometry, and bird construction have separate instructional purposes. The photograph supplies no replacement for those subjects.

## Fidelity and source limits

The chosen photograph sets the visual direction. It does not contain a complete alphabet or numeral system. The new source-derived letter and word models come from the attributed 1920 *Lessons in Ornamental Penmanship*, including the cited Zaner and Lupfer plates. Newly composed names, joins, spacing, and numeral line weights are identified as adaptations. They must not be described as exact copies of the photograph.

Zaner PDF page 6, printed page 4, explicitly specifies a 50° main slant and a 25° connective slant. The course also teaches the classical 52° main-slant reference. The practice desk supports both main-slant choices. A source plate is not proof that each visible curve is exactly 50° or 52°; the measured guides and the source letter forms have distinct roles.

The ten numeral studies use medial centerlines fitted to the existing historical SVG outlines at 12 times native raster resolution. They use an even fine line, without invented pressure shading. The comparison sheet was visually reviewed. Connected-component and enclosed-counter counts match each original numeral. These checks preserve shape topology; they do not establish pen motion or stroke order.

## Reproduction inputs

- `tools/ornamental-style.json`: 71 replacement records, source attribution, and adaptation notes.
- `tools/style-specimens/`: reviewed replacement SVGs.
- `tools/ornamental-glyphs.json`: 52 source glyphs with source slant and layout metrics.
- `tools/apply_ornamental_style.py`: registers specimen models and regenerates `assets/zaner-glyphs.js` from that JSON.
- `tools/render_reference_preview.py`: produces the white review sheet from actual app assets and the current signature renderer.

The glyph-pack generation was checked in an isolated temporary output directory. Its generated JavaScript passes `node --check`, and the JSON payload equals the complete reviewed source pack. The two modified Python tools pass `py_compile`.

`output/Spencerian-Reference-Studies.png` shows a complete phrase, lowercase forms, capital families, all ten numeral studies, and a source-based signature for Reuben Royal. It was rendered and visually inspected. The preview is a presentation sheet, not a phone screenshot.

## Release validation

The native Java implementation is unchanged by this asset update. The Android package, signing identity, lesson IDs, saved-state schema, and user records are intended to remain compatible with an update over the installed app.

Release verification completed:

- 25 DOM integration tests passed, including all 80 lesson routes, the 52 source glyphs, 50°/52° practice selection, saved progress and backup restoration.
- 17 practice geometry tests and 5 signature-renderer tests passed.
- 117 referenced SVG files passed vector, dimension and reference checks. All 71 replacement models differ from version 1.1.4; 98 models and 23 collections remain available.
- All three collection-caption audit findings were corrected. Source variants and citations were reviewed, including the explicit 50° instruction on PDF page 6.
- Signed APK built as version 1.1.5, version code 7, package `com.royal.spencerianlab`, minimum Android API 26.
- Every packaged asset matches the reviewed workspace bytes. Native DEX is byte-identical to version 1.1.4.
- APK signature schemes v2 and v3 and ZIP alignment passed verification. Signing certificate SHA-256: `680e45d2c014ccb9da17e33517022f7422597585831c17c910dbe1323f36a657`.
- APK size: 1,349,529 bytes. SHA-256: `ef00eadbbdbd1711c239c020072d641e2745391d2544173f84a71ead646506c8`.

Lesson IDs, quiz answer indices, checklist counts and drill counts remain unchanged. Existing saved progress remains compatible; the selected practice slant is now retained.

No physical Samsung S24 Ultra launch, S Pen pressure/palm rejection, file-picker lifecycle, or live paid-provider call is claimed by this report. Prior emulator renderer limitations remain documented separately in `docs/verification.md` and the startup-repair reports.
