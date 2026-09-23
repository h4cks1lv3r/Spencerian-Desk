# Clean source-derived capital lesson models

These are reviewed smooth vector reconstructions of the exact Compendium examples in the lesson manifest. No cursive font or generated substitute lettering is used. The models retain the source letter variants and their major pressure swells.

## Integration

Use `capital-c01.svg` through `capital-c10.svg` as the corresponding lessons’ `vectorOverride`. All source file, physical page, printed page, crop, transcription, and focus fields remain those of the existing manifest. c09 still reads **Paid Business Recede**. The ten SVGs are self-contained, with white backgrounds and dark green ink.

Suggested reproduction audit text:

> Source-derived cubic centerlines with cleaned pressure swells. Engraving texture and guide-dot artifacts removed; rules redrawn geometrically at source-measured positions. Local scan breaks restored from visible source strokes.

Use the existing builder's **Redrawn from…** attribution.

## Reproduction

1. Run `python3 tools/reconstruct_capitals.py`.
2. Run `python3 tools/finish_capitals.py`.

Inputs are the exact original Compendium page JPEGs already under `spencerian-lab/tools/source-pages/compendium-NNN.jpg`, with original lesson crop coordinates. Candidate outputs are written to `build/capital-proofs/`. The reconstruction script contains its own centerline functions. Reviewed drawings remain under `tools/source-tracings/` until explicitly replaced.

Method: local illumination normalization; bicubic 3× sampling; Gaussian 0.45 native pixels; skeleton graph with redundant diagonal edges removed; short branches pruned; opposite junction directions paired; arc-length cubic spline fitting (`s = 0.35 * sample count`). Hairlines are 0.7 native pixels. Separate substantial source swells are traced from contrast >0.35 with Gaussian 0.8 native pixels and component area >450 sampled pixels. c09 uses >9 sampled pixels to retain its smaller letter accents and i dot. Main mask cutoffs: 0.14 for capital panels, 0.105 for G, 0.065 for the word panel. Guide components are filtered independently.

## Reviewed local corrections

- c03: bridged Y's pale lower-stem scan break along the visible source direction.
- c04: joined J's detached exit fragment to its visible exit stroke.
- c05: removed a guide-dot branch inside A; separated A's downstem and crossbar loop where automatic skeleton pairing created a false wave. The original source construction was independently reviewed by two agents. The crossbar starts on the downstem and keeps the lower crossing.
- c06: removed a short guide-dot branch inside T's oval, independently verified against source.
- c09: restored Paid's i dot at native crop center `(109.5, 24.5)`; preserved Business's i dot and open e counters.
- c10: joined short source-visible gaps on H's downstroke and K's lower oval.

Fresh horizontal guide rules fit the four measured engraving row centers to an evenly spaced lattice. Their color and weight distinguish them from ink. The original paper texture and engraved guide dots are not retained.

## Visual QA

Each full-size PNG and `contact.png` was visually inspected. Main loop topology, shade placement, dot retention, cropping, and absence of grain were checked. These are labeled reconstructions; smoothing necessarily regularizes tiny engraving irregularities rather than preserving them as if they were deliberate pen movements.
