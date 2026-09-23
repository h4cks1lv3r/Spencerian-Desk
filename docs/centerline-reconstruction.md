# Source centerline reconstruction proofs

These 18 SVG proofs use the exact original Compendium JPEGs in the recovered project. They are source-derived reconstructions, not untouched facsimiles. The source page, crop, exclusions, and hashes are in `centerline-provenance.json`.

The reviewed SVGs are stored in `tools/source-tracings/`. Rebuilding candidates also creates a 1500-pixel-wide PNG preview. Shared models are repeated for their assigned lessons: a01/a04; a07/s03/s06; s01/s02/s04.

## Reproduce

Requirements: Python, numpy, scipy, Pillow, scikit-image, potrace, rsvg-convert.

```sh
python3 tools/reconstruct_centerlines.py --project-dir /path/to/spencerian-lab --output-dir /path/to/proofs
```

The project must contain `tools/lesson-examples.json` and the cached `tools/source-pages/compendium-NNN.jpg` files. An optional `--ids a01 a05 s01` selects a subset.

## Method and limits

The script normalizes paper illumination, isolates the dark ridge, creates a skeleton graph, removes diagonal shortcuts, pairs curves through crossings, and fits cubic B-splines. Hairlines are standardized to 0.7 original pixels. Original darker ink supplies the tapered shades. Smaller text uses lower smoothing, very small hole filling, and a separate shade threshold that retains dots and punctuation.

Small joins are limited to endpoints within seven source pixels, with source contrast and tangent evidence. No alphabet font or generated handwriting is used. The recovered JPEG remains the limit on exact shape evidence. The source has some intentional stroke breaks and scanned defects; the process does not certify pen stroke order.

The a08 file is a comparison candidate only; the advanced-curation agent owns the final verse and ornamental composition. a02, a06, and x02 are not included.
