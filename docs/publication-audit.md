# Spencerian Desk publication audit

Audit date: 2026-09-22. Scope: current source in `spencerian-lab`, previously released as 1.3.0/code 9; 1.3.1/code 10 contains the fixes below.

## Findings

### Resolved: long-term saved progress could disappear after reaching a record limit

Severity: high, data-loss risk. `validBackup` rejects more than 2,000 sessions or 1,000 saved signature concepts. The normal save actions previously allowed more records. `readState` then discarded the invalid state in memory and returned defaults without a warning. A later save could replace the original stored data.

Reproduced before the fix with the existing DOM test harness: start with 2,000 valid sessions and one completed lesson, log one paper session, and reopen. The database had 2,001 sessions and failed validation. The reopened app showed zero sessions and zero completed lessons.

Changes in `app/src/main/assets/app.js`:

- Share the existing session and signature limits between validation and save actions.
- Reject a new paper, digital, or signature record before mutation when the relevant collection is full. Explain the limit and ask the user to export a backup before deleting an old record.
- Permit updates to the active digital session at the session limit. Do not create a duplicate record or trim history.
- Validate state before every database save as an additional protection against persisting data the loader would reject.
- Keep invalid database or legacy data unchanged. Show a persistent recovery notice on all routes and block ordinary writes.
- Offer `Export recovery data` with the exact rejected JSON or legacy text. Offer a path to the existing backup tools. The rejected data is not inserted into the DOM.
- Only a successfully saved, explicitly confirmed valid backup restore removes recovery protection. A failed restore leaves the original data and recovery export available.
- Show a persistent notice when the database is unavailable; lessons remain usable and session export remains available.

This is a recovery safeguard, not an automatic repair or merge tool. A recovery file that exceeds record limits or has malformed fields must be repaired before it can be restored. No old records are deleted automatically.

### Documentation mismatch identified for publication

Severity: medium for installation and maintenance. At the start of this audit, README.md still directed installation of v1.2.0 and described the earlier restrained signature defaults, although source/build metadata were v1.3.0. Corrected in the current README and native build guide before publication. The release handoff should describe the new 1.3.1 recovery behavior, not only v1.3.0 artwork changes.

## Verification performed

Commands run from the project root:

```sh
node --test tests/dom/app.integration.test.cjs tests/signature/source-render.test.cjs tools/tests/practice_geometry.test.js
sh tests/native/run.sh /absolute/path/to/android-sdk
```

Before the audit fix: 36 DOM + 9 signature renderer + 17 practice geometry + 29 native boundary checks passed, 91 total. The new boundary reproduction then failed as described above.

After the fix, the full DOM suite passed with 41 tests, including five new regression tests. Renderer, practice, and Java/native source were unchanged by this fix; their 9 + 17 + 29 checks passed earlier in this same audit. Total relevant passing checks: **96**.

New regression coverage:

1. A full paper journal rejects a new entry without changing state, persisted history, or completed lessons; reopening retains all records.
2. A digital save can reach the session limit and update the same record there; a new desk session cannot exceed it.
3. A full signature collection rejects an additional concept without changing stored records or completion.
4. Invalid existing data remains protected, exact recovery export works, invalid or failed restore leaves it intact, and a successful restore resumes normal saves.
5. Valid legacy migration still works; malformed JSON and structurally invalid legacy records remain protected and export unchanged.

The existing unavailable-storage test now also checks the persistent warning and export action.

## Review scope and retained protections

- The course has 10 modules and 80 unique lessons. All routes and all lessons render in the DOM harness. Every lesson maps to existing local atlas assets and valid source references. Coverage includes all 26 lowercase letters, 26 capitals, and 10 digits.
- Atlas examples are local SVG paths, without embedded raster scans, script elements, or foreignObject elements. There are 98 models and 23 collections in the current source. This verifies asset integrity and mapping, not expert certification of every handwritten form.
- Signature Lab preserves the reviewed signing name. Unsupported spellings require explicit review. Draft abbreviation requires a choice. Existing source glyph contours remain present; bounding, slant adjustment, finish controls, and finish-study matching are tested.
- Photo import remains local until an explicit request. AI results are tied to the current name, photo revision, provider, brief, and goal. Changed context rejects stale results. Native requests also present a provider/model/image disclosure dialog.
- AI text is escaped. Only bounded numeric design fields can be applied. Returned code or SVG does not execute.
- Android serves bundled assets from its local HTTPS origin, blocks other WebView fetches, denies frames through CSP, disables file access and debugging, and opens external HTTPS links through the system browser.
- Provider credentials are stored with Android Keystore-backed AES-GCM, are not returned to JavaScript, and are excluded from progress exports and Android cloud backup. Custom endpoint redirects are disabled and changing an endpoint requires an explicit key entry. File transfers are bounded.
- The prior startup crash fix sets content before obtaining the window insets controller. A native recovery screen handles initialization or renderer failure. This source review does not prove a successful physical-device launch.

## Limits

No physical Samsung S24 Ultra or S Pen test, full WebView visual test, file-picker test on a phone, or live paid AI provider request was performed in this audit. The DOM harness mocks providers and canvas rendering. Native tests check boundary helpers and protocol parsing, not the full Android activity lifecycle. The separate current build report verifies rebuilt APK identity, certificate, alignment, and bundled-asset equality.

Signing speed, pressure control, stroke order, expert skill, and global signature uniqueness are not established by these checks. The app's handwritten practice instructions and its stated limits remain necessary.

No signing material, API key, private backup content, or other credential was opened or printed during this audit.
