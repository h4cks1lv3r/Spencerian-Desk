# DOM integration checks

Run `npm ci && npm test` in this directory with Node.js 20.19+.

The tests load the shipped HTML and JavaScript into jsdom, with fake IndexedDB,
a stub canvas context, and synthetic input. They do not open a browser, use an
Android emulator, contact an AI provider, or read user data. Canvas drawing is
not visually tested. Screenshot quality, Android WebView behavior, native file
pickers, physical S Pen behavior, and live API responses require separate checks.

Coverage includes routes, curriculum and plate references, lesson completion
gates, bookmarks, paper and digital progress, backup validation and restoration,
storage failures, AI draft retention, consent and provider request behavior.

Chosen-reference coverage includes home/lesson navigation, photo attribution, zoom, preserved progress, the textual AI style brief, and no automatic reference-photo upload.

Version 1.1.5 adds coverage of all 52 bundled source glyphs, reuse of their actual
ink paths in signature compositions, visible own-name previews, and the error
state for a missing glyph. All 80 lesson routes verify their assigned model
images and text labels. Practice checks verify 50-degree ornamental guides,
52-degree foundation guides, manual angle changes, and saved/restored guide
angles and feedback targets. These are DOM and data checks, not visual reviews.

The Signature Lab update also checks offline name-to-draft generation, deliberate
spelling confirmation, saved selections through reload, prior course records,
and the selected model at the practice desk. Photo tests use synthetic image data
and a stub native bridge. They check that upload alone makes no request, consent
is required, a vision reading remains editable until the user applies it, stale
responses are ignored, and malformed responses cannot create unsafe markup or
apply unsupported design settings. They do not verify a real provider's reading
accuracy or whether a proposed signature is fast or comfortable for a writer.
