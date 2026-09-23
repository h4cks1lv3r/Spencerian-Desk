# Spencerian Lab research notes

Checked 2026-09-11. These are implementation notes, not a claim that paid AI calls or every product were tested.

## Findings from the supplied documents

- `Best Pens, Pencils, Paper, and Writing Tools for Spencerian Script.pdf`, pp. 1-3: learn with a 0.5 mm HB pencil, move to a fine ballpoint for practical monoline writing, then use a pointed steel nib when learning traditional pressure shading. Its rankings are reasoned recommendations, not results of a controlled product comparison. The app should say "Recommended for this stage", not "scientifically best".
- That report, pp. 1-2 and equipment sections: Pentel P205, Uni Jetstream 0.5 mm, Nikko G, Zebra G, Leonardt Principal, an oblique holder, walnut ink, and smooth paper form a coherent progression. The report also recommends Pilot Acroball, HB wooden pencils, HP Premium32, Rhodia, and layout paper; not all need to be purchased.
- `spencerian_penmanship.pdf` is the historical *Spencerian Key to Practical Penmanship*. Printed introduction pp. 10-11 states the main slant is 52 degrees, emphasizes free hand-and-arm movement, flowing small-letter curves, oval capitals, individuality in capital choice, and eight principles in this edition. Do not silently replace its eight-principle terminology with the seven-principle sequence from a different source.
- Printed pp. 31-32 describe a light pen hold between thumb and first two fingers, a middle-finger support, and the other fingers gliding on the page. These are historical teaching positions, not a reason to force a painful joint position. Printed pp. 35-36 describe combined forearm, hand, and finger movement, plus whole-arm movement. Avoid the false instruction that fingers never move.
- The report explicitly distinguishes optional practical monoline Spencerian from ornamental pointed-pen writing. Do not shade every downstroke; selective shades belong after reliable forms. A phone canvas supports observation, tracing, rhythm, and review; it does not prove physical pen pressure control or expert mastery.

## Tool verification

The app asset has 10 selections across beginner writing, pointed nibs, holder, paper, and ink. Product specifications were checked against manufacturer or first-hand supplier pages. Suggestions about when to use each are curriculum judgments. No price or stock promises are included.

- [Pentel Sharp P205](https://www.pentel.com/products/sharp-mechanical-drafting-pencil): manufacturer lists P205A, 0.5 mm, HB lead, and 4 mm guide sleeve. It is a straightforward starting pencil; no evidence establishes it as uniquely best.
- [Uni Jetstream](https://www.unibrands.co/collections/jetstream): current official collection lists 0.38 and 0.5 mm options. The supplied research supports its low-pressure practice use. Exact body and refill availability depend on market.
- [Nikko G at John Neal Books](https://www.johnnealbooks.com/product/nikko-g-nib-10-pack) and [Zebra G](https://www.johnnealbooks.com/product/zebra-g-nib): specialist supplier describes Zebra as sharper and more flexible than Nikko and records Michael Sull's recommendation of Nikko for learning Spencerian. Manufacturer pages for these nibs did not load in this check. Do not represent that relative feel as measured stiffness data.
- [Leonardt Principal EF](https://www.paperinkarts.com/princi.html): supplier lists extra-fine and flexible character, use for Spencerian, and intermediate/advanced suitability. The original manufacturer's deep link did not load.
- [Speedball 2-in-1 holder](https://www.speedballart.com/2-in-1-pen-holder/): manufacturer confirms straight/oblique conversion and broad compatibility. Its flange is for right-handed use. Check the exact nib fit; do not promise every nib fits. Manufacturer advises removing excess ink, cleaning with mild soap or pen cleaner and water, and drying promptly.
- [Rhodia](https://rhodiapads.com/): official US distributor describes smooth, ink-friendly Clairefontaine paper. Performance still depends on the actual nib/ink combination.
- [Paper & Ink Arts Spencerian pad](https://www.paperinkarts.com/spnpad.html): own-brand page specifies 52-degree guides, 6 mm / 3 mm / 6 mm spacing, 50 sheets and 8.5 by 11 inch format. This is one practice format, not the mandatory historical proportion for every letter or capital.
- [Paper & Ink Arts walnut ink](https://www.paperinkarts.com/gall-walnut.html): own-brand crystals and ready-to-mix jars are listed. Follow the product label for dilution. Walnut-colored inks differ in composition; do not claim all use natural walnut or that all are archival. Dip ink should not go into a fountain pen unless its maker specifically allows it.

## AI request contracts

All providers: use an explicit user send action, state which provider receives the name/preferences and optional handwriting image, and keep the course usable offline. A consumer subscription is not an API credential. BYOK is a separate API setup with provider billing. Never bundle a developer key, log keys, send them to custom hosts without an explicit destination, or silently retry a failed paid call with a different provider. Keep model ID editable; model availability is account-specific. No credentials were available for live verification.

### OpenAI

[Vision guide](https://developers.openai.com/api/docs/guides/images-vision) verifies POST `https://api.openai.com/v1/responses`, `Authorization: Bearer <key>`, JSON content, and image data URLs. Suggested body uses `model`, `instructions`, `store:false`, and `input:[{role:"user",content:[{type:"input_text",text:prompt},{type:"input_image",image_url:"data:image/png;base64,..."}]}]`. Omit the image part when absent. Parse the REST response by iterating `output` message entries and their `content` entries whose type is `output_text`; read their `text`. The SDK's `output_text` convenience property is not a safe assumption for raw REST.

[Structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) verifies `text:{format:{type:"json_schema",name:"signature_coach",strict:true,schema:SCHEMA}}`. Make every schema object closed with `additionalProperties:false` and list all properties as required; use nullable values where needed. Handle refusal and incomplete output before parsing. Do not claim structural validity establishes correct penmanship. Avoid hard-coded temperature for unknown model families. Keep max output token settings conservative but large enough for the chosen schema.

### Claude

[Messages API](https://platform.claude.com/docs/en/api/messages/create) verifies POST `https://api.anthropic.com/v1/messages`, headers `x-api-key`, `anthropic-version:2023-06-01`, and `Content-Type:application/json`. Body: `model`, `max_tokens`, optional `system`, and `messages:[{role:"user",content:[...]}]`. Parse each returned `content` item of type `text`. Check stop_reason for truncation.

[Vision guide](https://platform.claude.com/docs/en/build-with-claude/vision) verifies image content as `{type:"image",source:{type:"base64",media_type:"image/png",data:"..."}}` and a text item `{type:"text",text:prompt}`. Native calls do not need the browser-only dangerous-direct-browser-access header. Resize handwriting images to a sensible resolution before sending while preserving readable strokes.

[Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) now uses `output_config:{format:{type:"json_schema",schema:SCHEMA}}`. The old `output_format`/beta header should not be the default. Support varies by model; validate user-selected model and surface provider errors clearly.

### Gemini

[GenerateContent reference](https://ai.google.dev/api/generate-content) still documents POST `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. Body: `systemInstruction:{parts:[{text:system}]}`, `contents:[{role:"user",parts:[{text:prompt},{inlineData:{mimeType:"image/png",data:"..."}}]}]`, and `generationConfig:{responseMimeType:"application/json",responseJsonSchema:SCHEMA}`. Omit image when absent. `responseSchema` remains shown in examples but is marked deprecated; prefer `responseJsonSchema`. Parse `candidates[0].content.parts[]` text, excluding thought parts; check promptFeedback and finishReason. Current tutorials favor the newer Interactions API, but adding it is unnecessary for this one-request implementation.

[API key guide](https://ai.google.dev/gemini-api/docs/api-key) verifies `x-goog-api-key` header and says new AI Studio keys are authorization keys. It describes a September 2026 transition away from standard keys. Send users to AI Studio for a fresh key if an old key is rejected; do not assume subscription access supplies one. Do not put keys into URLs or logs. The guide says production apps must not bundle keys client-side. User-entered keys belong in device-protected storage; a shared service key requires a backend.

### Other compatible providers

Use an explicit HTTPS base URL + editable model + user-entered key. The OpenAI-compatible convention is `/chat/completions`, `Authorization:Bearer`, `messages`, and `choices[0].message.content`. OpenAI's own [text guide](https://developers.openai.com/api/docs/guides/text) describes Chat Completions as supported legacy interface; a third party's compatibility must be verified with that provider. Default to text coaching for unknown endpoints. Do not assume image support, schema support, or a shared model catalog. Never execute returned SVG/HTML/JavaScript; render any signature suggestions with trusted local primitives and bounded, validated parameters.

## Suggested coaching schema and limits

Use an object with `summary`, `variants` (three entries: `name`, `style`, `construction`, `practice`), `drills`, and `cautions`. For photo review, use `observations` that separate visible evidence from uncertainty, `priorityFix`, and `practicePlan`. Treat numeric angle estimates from photos as estimates unless the image is calibrated. A static photo does not reveal stroke order, speed, grip, muscle movement, or pressure history.

Signature variants should optimize the user's own name and preferences: readable, balanced, restrained ornament, repeatable under normal time pressure. AI can suggest construction and drills; it cannot guarantee a design is unique worldwide. Traced or generated curves are design studies, not proof of traditional Spencerian correctness.
