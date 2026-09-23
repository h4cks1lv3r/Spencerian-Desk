# The Spencerian Desk · Signature Lab · 1.2.0

The app is now The Spencerian Desk. The classic white paper design, 80 lessons, artwork and existing progress remain in place. Signature Lab is the name of the signature feature.

## Behavior

- A typed signing name creates three local designs: Daily signature, Clear full name, and an optional shortened form. The shortened form abbreviates only the first word; it does not guess which words form a surname.
- New designs use a 52° main slant, the course's historical letterforms, modest capital size, and no added flourish. Capitals retain their source curves. Speed and ease are not calculated from the preview.
- The user must approve a supported spelling before generation if the letter set cannot show the name exactly. Unsupported-only and oversized names do not produce invented names.
- A current signature image stays in session memory. It is not included in a progress backup and is not automatically sent to a provider. It remains available while moving among app pages in the same session.
- Optional photo reading uses a connected image-capable provider and explicit consent. The result is an editable name plus features and suggested changes. The user must approve the name. Image reading is not local OCR.
- Optional refinement sends the selected name and current image with consent. It requests practical concepts at 52°, spacing 0.85–1.15, flourish 0 or 1, and capital size 0.85–1.05. Out-of-range concepts cannot be applied. AI SVG or code is never executed.
- Changing the photo, name, provider, brief, or goal invalidates old AI requests and results.
- A selected design can be saved, exported as SVG, or shown above a free-writing practice surface with 52° guides. The drill is five copies, followed by five repetitions from memory. This is copying practice, not verified stroke-order tracing.
- Existing lesson completion, signatures and backups remain compatible. Successful backup restoration clears stale design/photo context and uses the restored name.

## Verification

89 checks passed: 35 DOM integration tests, 8 signature tests, 17 practice-geometry tests and 29 native boundary checks. Coverage includes every lesson route, saved-state restoration, offline generation, character confirmation, photo consent, editable vision proposals, stale results, bounded AI designs, and photo-to-design refinement with mocked provider responses.

The signed APK is version 1.2.0, code 8, package com.royal.spencerianlab. Its original certificate is retained for update compatibility. Signature schemes v2 and v3 and ZIP alignment passed verification. All 133 bundled assets match the final working files. Native changes are limited to visible recovery-name strings plus normal version/resource changes; native DEX is not byte-identical to 1.1.5.

APK SHA-256: 7a40e5b1d028e8d90e5c735c5e212810cc6ab2b524e18828d5c86041964fb5b0

The signature draft comparison was rendered from the actual source-based composer and visually inspected. It is a specimen sheet, not a phone screenshot.

Browser visual testing could not run: downloading Chromium was denied by the environment network allowlist. A runnable mobile/desktop smoke test is included in tools/tests/signature_browser_smoke.cjs. No physical-phone launch, S Pen behavior, or live paid-provider response was verified in this release.
