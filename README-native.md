# Native Android shell

The Spencerian Desk supports Android 8.0 (API 26) and later. It targets API 36. The interface and curriculum are packaged with the app and work offline. AI requests require an Internet connection, a compatible model, and a provider API account with credit. A ChatGPT, Claude, or Gemini chat subscription does not itself supply an API key or API credit.

## Build

Install JDK 17, Android platform 36, and Android build tools 36.0.0. Then run:

```sh
python3 build_apk.py --sdk /absolute/path/to/android-sdk
```

The signed development APK is written to `output/The-Spencerian-Desk-v1.4.0.apk`. This build path has no Maven or Gradle dependencies. A standard Android Gradle Plugin 8.11.1 project is also supplied for Android Studio or an installed compatible Gradle 8.13 distribution. No Gradle wrapper binary is bundled.

Version 1.1.1 configures the system-bar insets controller after `setContentView`, ensuring that Android has created the window's DecorView. This fixes the reproduced version 1.1.0 launch crash in `PhoneWindow.getInsetsController`.

Startup initialization also catches runtime and linkage failures and displays a native recovery screen. `onRenderProcessGone` removes and destroys the failed WebView and offers a retry. Diagnostics include bounded startup exception details and Android/WebView versions; they never read saved provider credentials or send a report automatically. This recovery does not intercept OS process termination or native crashes in the host process. Run `tests/android/launch_smoke.py` against the signed APK on Android before distribution; see `tests/android/README.md`.

The manual build creates a new, app-specific signing identity in `.local-signing`. Keep those private files safe to sign future updates that install over this APK. Do not upload them to public source control. A source-only rebuild without that identity requires uninstalling the earlier build, which deletes local app data; export a progress backup first. This is a development package, not a Play Store release.

## Current release: 1.4.0 / code 11

The launcher is **The Spencerian Desk** and the package remains `com.royal.spencerianlab`. Version 1.4.0 addresses the supplied 1.3.1 audit: native parent-container insets, keyboard bounds, modern Back callbacks, WebView pause/resume, staged file-picker recovery, secure sensitive screens, a themed icon, cancelable AI requests, and truncation notices. The page adds navigation/draft recovery, accessible route focus and headings, pinch zoom support, a clearer Settings icon, privacy information, and confirmed local-data erasure.

Persistence now uses IndexedDB version 2 with separate drawing records and lazy retrieval. Metadata and changed drawings commit atomically; a validated legacy state migrates without changing the database name or lesson identities. New backups use a streamed JSONL container, while old JSON backups remain readable. See [the complete audit response](docs/audit-response-v1.4.0.md) for dispositions and the remaining native-device acceptance work. The 1.3.0 signature designs and 1.3.1 protected-recovery behavior are retained.

For an update to the maintainer-signed app, restore both original private signing files and run:

```sh
python3 build_apk.py --sdk /absolute/path/to/android-sdk --require-existing-signing
```

The builder rejects incomplete signing pairs before compilation. The flag also rejects a missing pair. A fresh personal build without the flag can create a new development identity; its APK cannot update an install signed by the maintainer. The GitHub CI package has a temporary identity and is a build check, not the installable maintainer update.

Current validation and limitations are in [docs/verification.md](docs/verification.md). Full context and maintenance rules are in [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md).

## Historical version 1.2.0 name and Signature Lab update

The launcher name is **The Spencerian Desk**. Release metadata is version 1.2.0, version code 8. The Android package remains `com.royal.spencerianlab`; bridge names, stored-record keys, and the restored signing identity remain unchanged. Native Java edits only update the three visible startup-recovery name strings. Native AI, image import, export, and credential handling retain their existing contracts.

Signature Lab creates three practical signature drafts from a typed name. It uses a 52° design slant and limited ornament for everyday signing. An optional current-signature photo can be sent through the existing consent dialog for AI review; recognized names require user review. The selected draft appears beside the practice area. These are design concepts, not authenticated signatures or measured guarantees of signing speed.

## Version 1.1.5 asset update

The native Java implementation and bridge contract are unchanged. The release updates the bundled specimen atlas, 71 model SVGs, curriculum guidance, practice-slant choices, and local signature renderer. `zaner-glyphs.js` supplies 52 shared source letter shapes and must load before `signature.js`. Regenerate that asset from the portable JSON source with `python3 tools/apply_ornamental_style.py`.

The new ornamental models retain the source manual’s 50° slant. The practice desk also supports the classical 52° guide. New name compositions and fine-line numeral adaptations are identified as adaptations; no missing glyph is claimed to be copied exactly from the selected photograph.

The package identity, local state keys, and signing identity are intended to remain unchanged for an update over the existing app. Final APK signature, DEX comparison, asset audit, and integration checks are recorded in the release verification report. Physical-device behavior still requires a device test.

## WebView bridge

Assets load at `https://appassets.androidplatform.net/assets/index.html`. Native code intercepts that origin from bundled assets; it does not fetch the page from the network. Other resource origins, frames, JavaScript URLs, cleartext traffic, file access, and WebView content access are blocked. HTTPS links open in the external browser. API calls run in native Java, so API credentials are never returned to JavaScript or saved in localStorage.

Bridge calls additionally require the trusted app page to be active. This remains `addJavascriptInterface`, not an origin-scoped messaging API; bundled-content restrictions and CSP are essential parts of its security boundary.

All methods are on `window.SpencerianNative`:

| Method | Input | Result |
| --- | --- | --- |
| `getProviderStatus()` | None | JSON string `{providers:[{id,provider,configured,model,endpoint,needsReset}],secureStorage:true}`; never includes keys |
| `saveProvider(json)` | `{provider,model,endpoint?,key}`; empty key preserves an existing key | JSON string `{ok,error?}` |
| `deleteProvider(provider)` | `openai`, `anthropic`, `gemini`, `custom` | JSON string `{ok,error?}` |
| `requestAI(id,json)` | `{provider,prompt,image?}`; image PNG/JPEG data URL | Native consent dialog, then `native-ai-result` event with `{id,ok,text,error,truncated}` |
| `cancelAI(id)` | Active request ID | Cancels local waiting/transport and prevents the canceled result from being applied |
| `importImage()` | None | `native-image` event with `{ok,dataUrl}` or `{ok:false,error}` |
| `exportFile(filename,mime,base64)` | Base64 file, maximum 40 MB | System file picker, then `native-export` with `{ok,filename,error?}` |
| `importBackup()` | None | Legacy whole-text import, bounded to 40 MB; `native-import` with `{ok,text}` or `{ok:false,error}` |
| `beginExport(filename,mime)` | Target name/type | Stages a private file; JSON result `{ok,id}` or `{ok:false,error}` |
| `appendExport(id,base64)` | Matching export ID, at most 196,608 decoded bytes | Appends one chunk; JSON result `{ok,bytes}` or an error |
| `finishExport(id)` | Matching export ID | Closes staging and opens the save picker; later `native-export` reports the actual result |
| `abortExport(id)` | Matching export ID | Discards the unfinished staged export |
| `importBackupStream()` | None | Opens a picker; `native-import-start` returns `{ok,id}` or an error |
| `readImportChunk(id)` | Active import ID; request only after processing the previous chunk | `native-import-chunk` returns `{ok,id,text,done}` or an error |
| `abortImport(id)` | Active import ID | Closes the source stream |
| `ready()` | None | Declares the frontend ready and releases queued native events |
| `setCanGoBack(boolean)` | Whether a dialog/nested route handles Back | Enables the API 33+ callback only where the app handles Back |
| `setSensitiveScreen(boolean)` | Whether credential/photo content is displayed | Applies/removes `FLAG_SECURE` on the activity window |
| `eraseCredentials()` | None | Cancels active AI and removes saved provider configurations; JSON `{ok,error?}` |
| `openExternal(url)` | HTTPS link | External browser |
| `finishApp()` | None | Closes the activity; retained for the legacy root-Back fallback |

`native-back` asks the frontend to close a dialog first or return through its route history. On API 33+, the callback is unregistered at the root so Android can handle Back; older devices use the guarded legacy path. This is not a custom animated preview of every page. `native-pause`, page visibility changes, and page exit trigger best-effort checkpoints of pending edits, navigation, and the bounded vector drawing draft. Photos and AI replies are deliberately excluded from durable recovery.

Provider aliases `chatgpt` and `claude` are accepted but canonical IDs are preferred. AI calls use the saved model, not a model supplied in a request payload. An empty key preserves a saved key only for the same provider. Changing a custom endpoint requires an explicitly entered key; an old key is not silently reused for a new destination. Importing a photo alone does not upload it. Before every AI call, a native dialog identifies the destination, model, inclusion of a photo, and possible API charges. Imported images are resized to at most 1600 pixels on their longest side, oriented using EXIF, re-encoded as JPEG, and stripped of metadata.

## Provider support

- OpenAI: `POST https://api.openai.com/v1/chat/completions`, bearer key, text or image content, `max_completion_tokens`.
- Anthropic: `POST https://api.anthropic.com/v1/messages`, `x-api-key`, `anthropic-version: 2023-06-01`, text or base64 images.
- Gemini: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, `x-goog-api-key`, text or inline images. Enter the model ID without `models/`.
- Custom: an HTTPS OpenAI-compatible endpoint ending in `/chat/completions`, bearer key, `max_tokens`. Enter the complete endpoint, not just the host or `/v1` root. Nonstandard ports, user information, query parameters, and redirects are rejected.

Provider keys and model configuration are encrypted with AES-GCM under an Android Keystore key and stored in private preferences. Backup and device transfer of app data are disabled. Neither provider response bodies nor credentials are logged. TLS validation uses Android system trust roots. HTTP redirects are disabled so authentication is not forwarded to a different endpoint. Error messages give status categories without echoing server responses or secrets. Only one AI request runs at a time; connection and read timeouts are 20 and 90 seconds.

Cancellation disconnects the active transport and invalidates its result. Token-limit stop reasons from OpenAI-compatible, Anthropic, and Gemini responses produce an explicit incomplete-response flag; the local text cap also marks truncation. The UI does not apply an incomplete design as a valid concept. Requests are still single-turn and non-streaming. Cancellation cannot recall sent content or guarantee that the provider stops charging. Socket timeouts receive specific feedback without exposing credentials or provider response bodies.

Model IDs are editable because availability differs by account and changes over time. OpenAI requires a Chat Completions-compatible model; Responses-only model IDs are not supported by this version. Text-only models cannot inspect an image. A provider can still reject a valid request due to account policy, credit, model permissions, or unsupported parameters. Live paid-provider calls require real credentials and are not part of build verification.


## Persistence and file transfers

`storage.js` keeps the database name `SpencerianLab` and opens version 2. The `progress` store's `state` record now wraps small schema-1 state and image references with `storageFormat: "SpencerianLab:2"`. `sessionImages` holds drawing data URLs, and `pendingImports` tracks staged restores. The normal UI loads metadata and image keys, fetching drawing payloads only for visible journal entries, previews, or exports. Frequent note/name/slider changes use a 250 ms save debounce. Existing valid inline-image records are split in one transaction after app validation. Invalid records retain recovery protection.

`backup.js` writes format `spencerian-desk-backup`, container version `2`: a JSON header containing schema-1 progress metadata and the expected drawing count, one independent `{type:"image",key,data}` record per drawing, and a `{type:"end",images}` footer. Each record ends with a newline. Restore validates the header/index, bounds individual records, rejects duplicate/missing/unexpected drawings or missing footer, stages images under temporary keys, and only atomically replaces progress after confirmation. An abandoned import is removed on the next database open. Existing schema-1 `.json` files still use the legacy 40 MB limit.

Native transfers use a separate worker from AI. New backup and recovery exports append decoded chunks of at most 196,608 bytes to private staging. Import decodes UTF-8 incrementally into at most 32,768-character text chunks without splitting surrogate pairs; the page requests the next chunk after processing the current one. The aggregate guard is 32 GiB, above the supported 2,000-drawing journal at its per-image limit, but the private cache, IndexedDB quota, and destination must have sufficient free space. Ordinary `exportFile` and legacy import remain capped at 40,000,000 bytes. Browser-preview backup export stays capped at 40 MB; native streaming is required for larger exports.

The staged file exists before the save picker opens, and its safe private filename is saved with activity state. It can survive activity recreation while the system picker is open. Successful writes and cancellations clean staging; failed writes attempt to remove the newly created destination. Android or a document provider may still terminate or invalidate an operation, so process-death and provider behavior remain device acceptance checks. Import confirmation never silently publishes a partial replacement.

Navigation is stored under `spencerian-desk-view-v1`; the bounded vector draft is under `spencerian-desk-practice-draft-v1`. These localStorage records contain no imported photograph or API key and are not journal-backup content. Draft recovery is best-effort and warns when a drawing exceeds its bound. Explicit `ERASE` confirmation clears local progress, draft/navigation records, pending work, and saved provider connections; it cannot delete external exports or provider-held content.

## Validation boundaries

`sh tests/native/run.sh /absolute/path/to/android-sdk` covers native safety and 19 AI transport boundary checks. `sh tests/native/run-transfer.sh` runs 25 file-transfer checks with a 32 MiB JVM heap, including a stream of more than 50 MB. That verifies bounded helper behavior, not a complete Android backup round trip or an Android heap measurement. Run all browser-state regressions with `node --test tests/dom/*.test.cjs`; CI uses the same glob and both native commands. Final suite totals and APK verification belong in [docs/verification.md](docs/verification.md).

No current device or emulator was available for API 26/30/33/35/36 acceptance. The real-browser attempt could not launch because a Chromium binary was unavailable. Keystore, insets/IME, native zoom/TalkBack, activity/file-picker process death, secure-window previews, and live provider calls therefore remain manual checks. The in-app privacy explanation does not establish Google Play policy or publication readiness.

API references checked September 11, 2026:

- [OpenAI Chat Completions reference](https://developers.openai.com/api/reference/resources/chat)
- [Anthropic Create a Message](https://platform.claude.com/docs/en/api/http/messages/create)
- [Gemini generateContent](https://ai.google.dev/api/generate-content)
- [Gemini API key authentication](https://ai.google.dev/gemini-api/docs/api-key)
