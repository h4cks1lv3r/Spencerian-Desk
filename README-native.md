# Native Android shell

The Spencerian Desk supports Android 8.0 (API 26) and later. It targets API 36. The interface and curriculum are packaged with the app and work offline. AI requests require an Internet connection, a compatible model, and a provider API account with credit. A ChatGPT, Claude, or Gemini chat subscription does not itself supply an API key or API credit.

## Build

Install JDK 17, Android platform 36, and Android build tools 36.0.0. Then run:

```sh
python3 build_apk.py --sdk /absolute/path/to/android-sdk
```

The signed development APK is written to `output/The-Spencerian-Desk-v1.3.1.apk`. This build path has no Maven or Gradle dependencies. A standard Android Gradle Plugin 8.11.1 project is also supplied for Android Studio or an installed compatible Gradle 8.13 distribution. No Gradle wrapper binary is bundled.

Version 1.1.1 configures the system-bar insets controller after `setContentView`, ensuring that Android has created the window's DecorView. This fixes the reproduced version 1.1.0 launch crash in `PhoneWindow.getInsetsController`.

Startup initialization also catches runtime and linkage failures and displays a native recovery screen. `onRenderProcessGone` removes and destroys the failed WebView and offers a retry. Diagnostics include bounded startup exception details and Android/WebView versions; they never read saved provider credentials or send a report automatically. This recovery does not intercept OS process termination or native crashes in the host process. Run `tests/android/launch_smoke.py` against the signed APK on Android before distribution; see `tests/android/README.md`.

The manual build creates a new, app-specific signing identity in `.local-signing`. Keep those private files safe to sign future updates that install over this APK. Do not upload them to public source control. A source-only rebuild without that identity requires uninstalling the earlier build, which deletes local app data; export a progress backup first. This is a development package, not a Play Store release.

## Current release: 1.3.1 / code 10

The launcher is **The Spencerian Desk** and the package remains `com.royal.spencerianlab`. The 1.3.0 update added prominent capitals, three different finishing designs, direct finish controls and the exact finish-study view. Version 1.3.1 protects saved data at the session and signature limits and preserves unsupported stored records for recovery. Native Java remains unchanged from 1.2.0.

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

All methods are on `window.SpencerianNative`:

| Method | Input | Result |
| --- | --- | --- |
| `getProviderStatus()` | None | JSON string `{providers:[{id,provider,configured,model,endpoint,needsReset}],secureStorage:true}`; never includes keys |
| `saveProvider(json)` | `{provider,model,endpoint?,key}`; empty key preserves an existing key | JSON string `{ok,error?}` |
| `deleteProvider(provider)` | `openai`, `anthropic`, `gemini`, `custom` | JSON string `{ok,error?}` |
| `requestAI(id,json)` | `{provider,prompt,image?}`; image PNG/JPEG data URL | Native consent dialog, then `native-ai-result` event with `{id,ok,text,error}` |
| `importImage()` | None | `native-image` event with `{ok,dataUrl}` or `{ok:false,error}` |
| `exportFile(filename,mime,base64)` | Base64 file, maximum 40 MB | System file picker, then `native-export` with `{ok,filename,error?}` |
| `importBackup()` | None | System file picker, then `native-import` with `{ok,text}` or `{ok:false,error}`; UI validates backup schema |
| `openExternal(url)` | HTTPS link | External browser |
| `finishApp()` | None | Closes the current app activity; call when Android Back is pressed on the home screen |

`native-back` fires for Android Back. The frontend should close an open modal first, return to its home screen from other routes, and call `finishApp()` when already home. Provider aliases `chatgpt` and `claude` are accepted but canonical IDs are preferred. AI calls use the saved model, not a model supplied in a request payload. An empty key preserves a saved key only for the same provider. Changing a custom endpoint requires an explicitly entered key; an old key is not silently reused for a new destination. Importing a photo alone does not upload it. Before every AI call, a native dialog identifies the destination, model, inclusion of a photo, and possible API charges. Imported images are resized to at most 1600 pixels on their longest side, oriented using EXIF, re-encoded as JPEG, and stripped of metadata.

## Provider support

- OpenAI: `POST https://api.openai.com/v1/chat/completions`, bearer key, text or image content, `max_completion_tokens`.
- Anthropic: `POST https://api.anthropic.com/v1/messages`, `x-api-key`, `anthropic-version: 2023-06-01`, text or base64 images.
- Gemini: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, `x-goog-api-key`, text or inline images. Enter the model ID without `models/`.
- Custom: an HTTPS OpenAI-compatible endpoint ending in `/chat/completions`, bearer key, `max_tokens`. Enter the complete endpoint, not just the host or `/v1` root. Nonstandard ports, user information, query parameters, and redirects are rejected.

Provider keys and model configuration are encrypted with AES-GCM under an Android Keystore key and stored in private preferences. Backup and device transfer of app data are disabled. Neither provider response bodies nor credentials are logged. TLS validation uses Android system trust roots. HTTP redirects are disabled so authentication is not forwarded to a different endpoint. Error messages give status categories without echoing server responses or secrets. Only one AI request runs at a time; connection and read timeouts are 20 and 90 seconds.

Model IDs are editable because availability differs by account and changes over time. OpenAI requires a Chat Completions-compatible model; Responses-only model IDs are not supported by this version. Text-only models cannot inspect an image. A provider can still reject a valid request due to account policy, credit, model permissions, or unsupported parameters. Live paid-provider calls require real credentials and are not part of build verification.


File transfers use a separate worker so an AI request does not block the photo picker or exports. Both backup import and export have a 40,000,000-byte cap. Export base64 is decoded as a stream into a private temporary file and copied to the user-selected document; the temporary file is removed after completion, cancellation, or failure. The app does not allocate an extra whole-file byte array for export. The transfer cap is independent of the AI image limits. Storage quota can still limit how much restored data the frontend can save.

Native validation: `sh tests/native/run.sh /absolute/path/to/android-sdk` runs 29 offline JVM boundary checks. Android-specific Keystore, activity/file picker lifecycle, and provider network calls still require device testing.

API references checked September 11, 2026:

- [OpenAI Chat Completions reference](https://developers.openai.com/api/reference/resources/chat)
- [Anthropic Create a Message](https://platform.claude.com/docs/en/api/http/messages/create)
- [Gemini generateContent](https://ai.google.dev/api/generate-content)
- [Gemini API key authentication](https://ai.google.dev/gemini-api/docs/api-key)
