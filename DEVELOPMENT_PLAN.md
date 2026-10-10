# Kwagi development plan

Updated October 10, 2026. Current scope: a private, offline study app for students in any course. This plan supersedes the July launch schedule; it does not imply store availability.

## Product outcome

A student can turn class notes into useful questions, review what is due, test recall, and keep a recoverable copy of their library. The app should make the next useful action obvious and preserve trust in saved content and progress.

Keep the Expo 57 / React Native / SQLite / AsyncStorage stack. The audit upgraded SDK 56 to address the Hermes memory regression flagged by Expo Doctor. Keep the owl, amber accent, light and dark themes. Use the existing native components; web component kits and animation libraries do not justify adding a second UI system.

## Delivered in this audit pass

- Study desk with one data-driven next action, readable progress, and responsive tablet columns.
- Balanced Home / Notes / Study / Cards / Progress navigation and calmer screen backgrounds.
- Explicit card subject selection and reassignment, due/paused filters, searchable virtualized library without the former 500-card cutoff.
- Note generation count preview and discard protection on editor back navigation.
- Direct due review, guarded quiz exits, distinct-answer quiz validation, foreground study timing, and stale-card review rejection.
- Complete backup validation, visible restore confirmation/errors, browser downloads, SQL rollback tests, and native-connection foreign-key enforcement.
- Reduced-motion corrections, visible-side flashcard accessibility, clearer goal units, and course-neutral XP level names.

Verification and remaining limitations are recorded in [CODEBASE_AUDIT.md](CODEBASE_AUDIT.md).

## Study-material features (decided October 10, 2026)

The owner chose to keep every new feature offline-first. These decisions apply until the owner revisits them:

- **Processing:** on the device only. A cloud AI option may come later as an opt-in setting and needs its own privacy, cost, and Data safety review.
- **Review before save:** imported text, transcripts, summaries, and generated cards are shown for review and editing before anything is stored.
- **Storage:** local data and local file storage first; avoid cloud databases and cloud file storage. Kept originals (photos, PDFs, Office files, later recordings) live in the app's documents folder with an `attachments` record per file, are optional per import, are shown per subject in Settings > Storage, and are excluded from JSON backups. Photos are kept as upright 2400 px JPEGs (about 1 MB).
- **Platforms:** native-only features (photo, PDF, and recording) are hidden on the web and in Expo Go; pure-JavaScript readers work everywhere.
- **Devices:** a basic path must work on budget Android phones; better on-device models are an optional extra where the hardware supports them.
- **Model downloads:** large speech or language models are optional, Wi-Fi-only downloads rather than part of the install.

| Slice | Status | Acceptance |
| --- | --- | --- |
| 1. Note import: photos (camera/library), PDF, Word, PowerPoint, text, Markdown | Source complete; native builds untested | Physical Android and iPhone builds read printed notes, handwriting (best effort), a text PDF, and a scanned PDF (clear rejection); first-launch offline OCR works on Android; temp files are removed; camera permission denial is handled |
| 1b. Local storage for kept originals | Source complete; native builds untested | Kept files survive app restart and update, open in another app, are removed with their note/subject/restore/clear, orphan sweep runs at launch, low-space guard keeps note text |
| 2. Lecture recording and on-device transcription | Not started | Background recording for 1 to 2 hours, chunked Whisper transcription with progress, English-first model, optional model download |
| 3. Summaries and generated cards/quizzes | Not started | Extractive summary on every device, on-device LLM where supported, per-card source sentence, accept/edit/discard review, hand-graded accuracy on 20 to 30 real notes |

## Phase 1: Prove the offline beta on devices

Priority: next. Owner: engineering, with signing/account access from the owner.

1. Run the exact candidate on a physical Android phone and an iPhone through an authorized internal build.
2. Test fresh install, starter library, subject/note/card CRUD, generated-card deduplication, quiz completion, due review, relaunch persistence, backup roundtrip, and complete reset.
3. Test airplane mode; interrupted writes; low storage; app background/foreground; device date changes; large text; TalkBack/VoiceOver; keyboard avoidance; and Reduce Motion.
4. Record platform, OS, device, commit, artifact/build ID, steps, actual result, and evidence in a device matrix. Source-level SQL tests do not establish Expo device behavior.
5. Resolve dependency advisories and repeat compatibility checks; use tested updates within SDK 57. Never downgrade Expo or force a major dependency change just to silence an audit.

Acceptance: both platforms complete every critical flow, no unresolved data-loss defect, no crash on restore/relaunch, controls readable and reachable at supported text sizes. No beta promotion until this evidence exists.

## Phase 2: Make long-term study reliable

Prioritize these ahead of accounts or AI:

| Work | User benefit | Acceptance |
| --- | --- | --- |
| Durable note drafts | Recover work after process death or browser reload | Draft restored per subject/note; explicit save/discard; reset removes drafts |
| File-based backup import and restore preview | Avoid pasting large JSON documents | File save/restore shipped October 10, 2026 (see `PERFORMANCE.md`); still needed: restore preview with table counts, cancellation tests, and native device checks |
| Unified persistence or recovery journal | Recover an interrupted restore across SQL and preferences | Fault injection at every commit boundary; deterministic startup recovery |
| Subject-scoped scheduled review | Study one class at a time | Subject due counts and queue agree; no unrelated cards enter session |
| Missed-answer review | Turn mistakes into the next study session | Review only actual missed cards; handle edited/deleted cards; no synthetic questions |
| SQL search and pagination for very large libraries | Keep memory/search responsive | Notes list and search moved to SQL previews October 10, 2026; card library paging remains. `npm run stress` measures 1k to 40k-card fixtures; confirm budgets on devices |
| Export/import compatibility fixtures | Keep old libraries usable | Every supported released backup version migrates or produces a specific safe rejection |

Acceptance for each slice: source review, regression tests, relevant browser preview checks, and both native platform checks where behavior differs. Deliver one complete slice at a time.

## Phase 3: Prepare distribution

Owner gates: developer accounts, signing ownership, operator/support details, and final legal/store declarations.

- Link the intended EAS project and preserve `com.stackwise.kwagi`.
- Keep the published privacy/support pages healthy; they were deployed from commit `2368991` and verified with HTTP 200 on September 9, 2026.
- Produce signed Android and iOS internal artifacts and capture screenshots from those native builds.
- Complete store metadata, privacy/data declarations, support process, accessibility disclosures, and required testing using current provider requirements.
- Submit only the exact tested candidate. Track internal build, submitted, approved, and publicly available as separate states.

Acceptance: reproducible release record with commit, build IDs, testing evidence, working policy links, store status, and rollback/support owner. An Expo export is not a signed app or store release.

## Phase 4: Validate demand before expanding scope

Collect voluntary beta feedback about first-note setup, card quality, review usefulness, backup confidence, and return visits. Do not add analytics silently. Define any data collection separately with consent/disclosure and data minimization.

AI explanations, cloud sync, accounts, paid plans, board-exam content, and review-center partnerships remain separate product decisions. Each needs demand evidence, operating cost, privacy/security design, content rights where applicable, evaluation, and support coverage before implementation.

## Delivery discipline

- Maintain a clean install, lint, typecheck, tests, SDK compatibility, dependency audit, and all-platform export gate.
- Keep source tests, web preview, native device QA, signed builds, and production verification separate in every handoff.
- Keep `.claude/`, secrets, private backups, local IDE state, and generated QA captures out of published source.
- Use meaningful commits and a reviewed integration branch when incorporating the existing uncommitted candidate.
