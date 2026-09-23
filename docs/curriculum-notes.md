# Spencerian Lab curriculum notes

The bundled curriculum contains **80 original lessons in 10 ordered modules**, with 1,449 suggested first-pass lesson minutes. This is about 24 hours of suggested lesson sessions; it is **not** a time-to-mastery claim. Repeated practice, physical tool control, and independent critique will require additional time. Lesson completion, quiz results, and practice time are different records from demonstrated penmanship skill.

The prose, examples, exercises, error checks, quizzes, and project briefs are newly authored paraphrases and modern instructional design. The app does not reproduce the modern personal-use practice-sheet set. The historical atlas is a separate asset prepared from the supplied public-domain historical books.

## Coverage

| Module | Lesson IDs | Count | Coverage |
|---|---|---:|---|
| Start with control | f01–f08 | 8 | Starting specimen, tools and paper, desk and posture, right-handed grip, left-handed adaptation, 52° baseline angle, connective slope, proportions, self-review |
| Principles and movement | m01–m08 | 8 | Seven principles, combined movement, main strokes, lower and upper turns, loops, direct/reverse/inverted ovals, compound curve, capital stem, checkpoint |
| Small-letter families | l01–l10 | 10 | i, u, w, n, m, x, v, o, a, e, c |
| Extended letters | e01–e08 | 8 | r, s, t, d, p, q, l, h, k, b, j, y, g, z, f; complete lowercase review |
| Words and numbers | w01–w08 | 8 | Joining routes, optical spacing, rhythm, dots and crossbars, 0–9 in five explicit pairs, random-number recognition |
| Capitals | c01–c10 | 10 | O/C/E/D, X/W/Q/Z, V/U/Y, I/J, A/N/M, T/F, S/L, G, P/B/R, H/K; complete A–Z review |
| Practical refinement | r01–r07 | 7 | Pointed nib preparation, pressure/release, selective lowercase and capital shading, reduced scale, page writing, portfolio |
| Flourishes | a01–a08 | 8 | Purpose, progressive ovals, entries/exits, ascenders, descenders, crossings/tangencies, visual hierarchy, finished phrase |
| Ornamental composition | x01–x07 | 7 | Compound curves, spirals and S-curves, stroke order, offhand bird study, monograms, ornamental page, expert-study portfolio |
| Personal signature | s01–s06 | 6 | Design brief, leading initial, three design systems, optional AI critique, repeatability trials, final design and maintenance |

## Source convention

Every lesson has source references with **one-based physical PDF page numbers**. Printed page numbering cannot be used uniformly because the supplied scans include covers, blank pages, unnumbered plates, and at least one duplicate printed page.

| Source ID | Supplied filename | Main use |
|---|---|---|
| key | spencerian_penmanship.pdf | Earlier detailed analysis of letter construction, dimensions, probable faults, spacing, and shading |
| compendium | New Spencerian Compendium_text.pdf | Primary model map; combined movement, practical lessons, measured alphabet, ornamental capitals, flourish construction |
| class | CLASS-SpenceModule-01download.pdf | Modern grouping and guide context; consulted only, personal-use sheet layout is not reproduced |
| tools | Best Pens, Pencils, Paper, and Writing Tools for Spencerian Script.pdf | Modern equipment and practice context; product rankings are not controlled performance trials |

Selected physical references were checked through text extraction and visual inspection. These include Compendium PDF page 73 (Plate 2 measured alphabet and seven principles), PDF page 126 (Plate 48 flourish elements), and the modern handout PDF page 6 (capital principles). The atlas agent separately prepared and inspected the authentic image references used by the app.

## Important technical distinctions

- **52° is measured upward from the horizontal baseline.** The complementary angle from vertical is 38°. A right-leaning main stem has its upper point to the right of its lower point. For vertical rise `h`, the horizontal offset is `h / tan(52°)`, approximately `0.781h`.
- This is the main axis of the form, not a fixed tangent required at every point on a curve.
- The Compendium gives approximately **30° connective slope** (physical PDF page 34). The earlier Key describes **34° pointed-oval constructions** and letter-specific curve variation (physical page 61). The course does not pretend these are an identical universal rule for every upstroke.
- The Compendium Plate 2 uses **seven principles**. The Key uses **eight**, with its capital components separated differently. The curriculum names the source and teaches the seven-principle Compendium map while explaining the older taxonomy.
- The Key’s detailed lowercase proportion model is cited where used: one-unit short bodies, slightly elevated r/s, two-unit t/d, three-unit looped ascenders, and letter-specific descenders. These are selected historical models, not a claim that every historical form uses identical proportions.
- Most standard capitals use the measured Compendium model. The I/J lesson specifically avoids mixing the Compendium reverse-oval-related forms with the earlier Key capital-stem classification. The beginner x lesson explicitly selects the earlier Key two-stroke form and notes the existence of a continuous variant.
- Historical letterforms must be learned alongside the authentic atlas. The application practice-template paths are schematic movement aids; they are **not exact alphabet tracings** and a generic script font is not presented as a substitute historical model.
- Pixel dimensions on a display do not guarantee physical millimeters. Paper exercises specify measurable x-heights; digital guides are relative proportions.

## Assessment and AI limits

The original self-rating rubric uses 0–3 across slant, proportion, spacing, smoothness, and legibility. A suggested milestone is mostly 2s and no 0s in independent samples from separate sessions. This is a practical reflection aid, **not a validated assessment instrument**, an accredited qualification, or a locked advancement requirement.

The expert portfolio adds hierarchy, crossing clarity, and consistency of style. It asks learners to retain full specimens and revisions rather than treating one successful letter as mastery. Images cannot establish the writer’s actual movement, grip pressure, or comfort. In-person or video-based teacher critique can resolve those questions better than a still image.

The signature module is for the learner’s own name or a fictional practice name. It makes no claim of global uniqueness, forgery resistance, legal validation, or identity security. AI responses are suggestions to test, including spelling, stroke feasibility, and historical accuracy. AI use is optional, and provider access/billing is described separately from consumer chat subscriptions. The curriculum tells learners to use only supported input types and never implies that an unseen handwriting image was assessed.

## Data validation

The generated JSON has:

- 10 modules and 80 distinct, stable lesson IDs.
- Three substantive teaching/review sections per lesson.
- At least two specific drills and two mistake/fix pairs per lesson.
- Three observable objectives and self checks per lesson.
- One multiple-choice knowledge question with an in-range answer index and explanation per lesson.
- Source references and atlas `exemplarIds` per lesson.
- Explicit complete coverage of all 26 lowercase letters, all 26 capitals, and all 10 digits.

Correct-answer positions are distributed deterministically across the three options so that choosing the first option is not a useful shortcut. Current content version is integer `1`.

## Remaining instructional limits

This first version provides extensive written instruction and authentic source exemplars. It does not claim to replace live demonstration of every pen stroke, a qualified teacher, or physical practice. Exact motion tracking, calibrated pressure measurement, reliable automated handwriting grading, and globally unique signature verification are not claimed by this curriculum. Modern pen availability and product specifications belong in the separately researched equipment guide and can change.
