# Lesson-specific study artwork, version 1.1.3

## Source selection

All 80 lessons have focused study examples: 94 main illustrations, with separate panels for combined movement diagrams. The home card follows the first incomplete lesson. Lesson openings show the corresponding target forms, a short explanation of what to inspect, and exact source references. The atlas contains 22 collections of the same selected models. Full page snapshots are no longer packaged in the app.

The selection uses the supplied Spencerian Key to Practical Penmanship and New Spencerian Compendium. The supplied modern CLASS sheets were inspected; their blank guidelines do not provide the formed-letter models needed here. The tools report informs the course but is not a source of penmanship models.

Basic letters come from the Key’s correct models, not its deliberately incorrect “Probable Faults” rows. Capital families retain the Compendium forms used by the course; different Key variants were rejected where their construction would conflict with the lesson. Examples of relevant connected writing include “Specimen of my plain penmanship” for word spacing, “Paid Business Recede” for P/B/R, London for tall-capital flourishes, Sunday for a terminal descender, and verified historical names for signature study.

## Same scan, earlier copy

The supplied Compendium PDF uses mixed-raster compression. Its ink mask loses many real hairlines; simply removing its background produced broken lettering. An earlier openly available PDF of the exact same scan preserves the original JPEG page images before this processing:

https://luc.devroye.org/NewSpencerianCompendium.pdf

Its 175 embedded book images match the dimensions of all 175 supplied PDF pages. Visual comparisons of the word and signature plates confirm matching page content with better retained fine curves. The earlier PDF includes an extra FreshView opening page and HTML headers; therefore the builder extracts its sole JPEG at zero-based index equal to the supplied physical page number, rather than cropping the rendered PDF page. Normalized selections apply to that JPEG. This is not a new, higher-resolution scan. See `source-scan-provenance.json` for the download hash and page correspondence.

Only the selected native Compendium page inputs are retained in `tools/source-pages/`, outside Android assets, so the cleaned SVGs remain reproducible without embedding book scans in the app.

## Clean reproduction

The Key’s dark ink masks are isolated from paper. Compendium ink is separated from background illumination in the earlier JPEGs, using individually reviewed contrast thresholds where necessary. Small scan debris and explicitly identified unrelated neighboring marks are removed. Basic models use conservatively smoothed SVG contours traced from the retained ink. Delicate Compendium lettering uses fitted centerline curves and source-based shaded swells so JPEG grain does not become a ragged outline. White backgrounds and dark ink replace paper shadows, stains, gray texture, and JPEG blocks. The delivered SVGs contain paths and text, with no embedded raster images or remote dependencies.

The source crop, exclusions, threshold overrides, and narrowly reviewed repairs are explicit in `tools/lesson-examples.json`. Three Key letters (n, m, k) required minimal one-pixel-width bridges across verified two-to-three-pixel scan gaps. These connect existing source-ink endpoints; they do not substitute new letter constructions. The isolated zero keeps only its complete connected figure, removing three unrelated spots. The ornamental bird is redrawn from the cleaner Plate 51 figure, with body, framework, and finished stages taken from the same vector drawing. The verse is source-guided lettering redrawn from Plate 55. The page-composition lesson combines those two models in a new teaching arrangement; its two source pages are both cited.

The 52-degree diagrams are reconstructed with exact trigonometric coordinates and clean type because tracing the old numeric labels made “52” ambiguous. Their source citation is retained. Movement-family montages use traced source strokes with readable typeset labels; detached old principle numbers are removed so different historical numbering systems do not confuse the course’s seven-family map. Original instructional baselines remain on Key diagrams where they explain the form. Capital models use clean source-shaped strokes, replacing old measuring dots with faint geometric horizontal rules so the guides do not obscure the letter contours. The progressive oval, compound flourish, and spiral drills are regularized vector reconstructions of their source patterns, with continuous hairlines and tapered shading. The oval construction uses a 52-degree major axis. Redrawn studies are identified as such in their source captions.

The models are clean study reproductions, not new pen-written originals or facsimiles of untouched pages. Source letter constructions and historic variants are retained, while scanning defects are removed and damaged curves are redrawn for clarity. Authoritative editable redraws live under `tools/source-tracings/`; each manifest override records the source page and method. Rebuilding the atlas copies these reviewed vectors rather than reintroducing scan defects. Vector enlargement keeps the contours sharp.

## Interaction and preservation

Each figure opens an offline enlargement viewer with a 100–300% control. Wide word examples scroll horizontally within the lesson. Collections provide focused models rather than a small image of an entire page. Source descriptions, labels, and accessible names accompany the artwork.

The native Android classes, course progression, storage schema, API connections, practice engine, and signature generator are unchanged. The examples supplement the existing teaching text and drills. Full verification results are in `verification.md`.
