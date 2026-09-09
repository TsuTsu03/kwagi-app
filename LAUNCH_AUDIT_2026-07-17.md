# Kwagi Launch Readiness Audit

**Audit date:** July 17, 2026
**Target date:** July 20, 2026
**Scope:** Full owned codebase, Expo/EAS release configuration, runtime/data risks, launch operations, Google Play, and Apple App Store review readiness.

## Remediation Update — July 18, 2026

**Decision remains NO-GO for public store submission.** The owned codebase and local release gate are now ready for a native release candidate, but provider/account, public-policy, native-device, and store-console gates remain open.

### Completed in the owned codebase

- Locked v1 to a course-neutral, offline study workflow using user-created subjects, notes, flashcards, quizzes, and progress. Removed the visible AI surface, AI settings/claims, seeded professional-board question banks, unsupported board fallback, and the obsolete chat database table.
- Set the final iOS/Android identifier to `com.stackwise.kwagi`; added build versions, encryption declaration, tablet opt-out, SDK 56 splash configuration, EAS build/submit profiles, and SDK-compatible dependency patches.
- Added note-to-card generation with duplicate prevention and one atomic note/card transaction. Quiz completion, flashcard reviews, migrations, deletes, restore imports, and clear operations now use transactions; native writes use isolated Expo SQLite transactions.
- Enabled foreign keys and cascade-safe schema behavior, added schema version 3 migrations, fixed Hard-vs-Again SRS behavior, local-calendar streaks, duplicate quiz choices, retryable database startup, complete data reset, and serialized preference persistence.
- Added loading, empty, retry, busy, and error states to critical database flows; locked rapid quiz/review submissions; added OS Reduce Motion support with Device/On/Off control; removed fixed-height flashcards; improved accessible names and 44-point controls.
- Added in-app privacy/disclaimer/support, static privacy/support source pages, store copy/declarations, README/release/incident instructions, CI, release scripts, branded app/splash/adaptive icons, a 512×512 Play icon, and a 1024×500 feature graphic.
- Removed the obsolete AI marketing capture. Generated browser QA captures are explicitly excluded from store assets because native screenshots are still required.

### Current verification evidence

- `npm.cmd run release:check`: **pass** — Expo lint, TypeScript, 14 unit tests, Expo Doctor **21/21**, and clean Android/iOS/web exports.
- `npm.cmd run qa:web`: **pass** — onboarding, subject/note creation, note-to-card generation, quiz completion, persistence after reload, complete data reset, all tabs, legal screen, mobile layout, and desktop layout.
- `npx.cmd expo config --type public`: **pass** — SDK 56 resolves the final identifiers, versions, splash, adaptive icon, and tablet setting.
- `npm.cmd run assets:store`: **pass** — deterministic brand assets generated at the required icon/feature-graphic dimensions.
- `npm audit --omit=dev`: **11 moderate** transitive findings through Expo build tooling (`xcode` → `uuid`). The suggested force fix would break SDK alignment and was not applied.

### External gates still blocking submission

- EAS CLI is **not logged in**, so the project cannot be linked and no Android AAB, iOS store build, EAS build ID, signing validation, TestFlight upload, or Play internal-test artifact exists.
- The prepared GitHub Pages privacy/support URLs currently return **404** because the workflow has not been committed and deployed. The policy pages also need the final public developer/operator name and a working support/privacy email or no-login contact form.
- Physical Android/iPhone QA, airplane/process-kill/large-text checks, native screenshots, store records, developer-account declarations, content ratings, privacy/data-safety forms, signing, pre-launch reports, and review submissions require the account owners and real devices.
- Do not create a release tag or claim store availability until every item above is verified and its build/store evidence is recorded here.

## Executive Decision

**Public production launch on both stores by July 20: NO-GO.**

- Production readiness: **34/100 (blocked)**.
- Store submission readiness: **18/100 (blocked)**.
- The app can type-check and export JavaScript bundles for Android, iOS, and web, but no native store binary, EAS project, store record, native-device test, or store submission was found.
- Apple can reject the visible AI placeholder under App Review Guideline 2.1 (app completeness).
- Google Play can reject misleading or incomplete functionality, and a new personal Play developer account may require 12 opted-in closed testers for 14 continuous days before production access.
- Store approval timing is controlled by Apple and Google. Even a compliant submission on July 20 cannot guarantee public availability on July 20.

**Realistic July 20 goal:** release an honest internal beta through Google Play internal testing and TestFlight internal testing, provided developer accounts and signing access already exist. Treat public store launch as a later approval milestone.

## Recommended Scope Lock

Ship a smaller **offline v1** first:

1. Support only NLE, ECE, and CPA until the other question banks exist.
2. Remove the Chat tab, AI settings toggle, and all AI claims from v1. The alternative is a secure server-backed AI implementation, moderation/reporting, privacy disclosures, and additional QA, which does not fit the deadline.
3. Do not claim notes generate flashcards. The app can create notes, but no UI calls `createFlashcard`.
4. Do not mention Premium, subscriptions, cloud sync, or account features in store metadata. None exist in this checkout.
5. Position the release as an offline quiz, seeded flashcard, notes, and progress app.

## Launch Blockers

### P0: Store Build And Configuration

- `app.json` has no `ios.bundleIdentifier` or `android.package`. Expo resolves both to `com.placeholder.appid`, which cannot be used as the final store identity.
- `eas.json` is absent. There is no EAS project ID, production profile, auto-increment policy, or submit profile.
- `ios.buildNumber` and `android.versionCode` are not defined or managed remotely.
- `ios.config.usesNonExemptEncryption` is not declared, so export-compliance questions are not preconfigured.
- No AAB, IPA, EAS build ID, App Store Connect record, Play Console record, signing validation, or submission result exists.
- Expo Doctor reports `newArchEnabled` as invalid in the SDK 56 app config schema.
- Expo Doctor reports missing direct peer dependency `expo-font`; it warns that standalone builds may crash outside Expo Go.
- Expo Doctor requires patch updates: `expo` 56.0.12 -> 56.0.16, `expo-constants` 56.0.18 -> 56.0.21, `expo-linking` 56.0.14 -> 56.0.15, and `expo-router` 56.2.11 -> 56.2.15.

### P0: Visible Incomplete Or Misleading Functionality

- `app/(tabs)/chat.tsx:26-29` explicitly identifies the AI tab as a placeholder. The screen advertises explanations, mnemonics, and quiz generation, but none work.
- `app/(tabs)/chat.tsx:85-86` tells users to add an Anthropic key in Settings, but Settings contains no key input.
- `app/settings.tsx:172-188` exposes an AI toggle that has no effect.
- `app/(tabs)/index.tsx:195` labels the placeholder as an “AI study buddy.”
- Only NLE, ECE, and CPA have questions. In `app/(tabs)/quiz.tsx:161-165`, all other selected boards silently fall back to the global mixed question pool.
- The setup offers 20 questions, but each supported board has only 10; `slice` returns 10 while the user selected 20.
- The notes flow never creates flashcards. `lib/db/flashcards.ts:45-69` is not called by any UI.

### P0: Privacy, Support, And Medical Content

- There is no in-app Privacy Policy, Support, contact, Terms, or medical disclaimer link.
- There is no public privacy-policy URL or support URL in the repo or release configuration.
- Apple requires an accessible in-app privacy policy and a privacy-policy URL in App Store Connect. Apple also requires current support contact information.
- Google requires a public, non-PDF privacy policy even when no data is collected, plus matching Data Safety answers.
- NLE content is medical reference/education. Google requires an accurate Health Apps declaration, a privacy policy, and for non-medical-device health apps a clear disclaimer plus a reminder to consult a healthcare professional.
- Apple applies greater scrutiny to potentially inaccurate medical information. The medical, tax, and legal question bank has no sources, review date, or qualified reviewer record.

### P0: Runtime And Data Integrity

- `components/quiz/Flashcards.tsx:65-79` has no submission lock. Rapid taps can review the same card and add progress more than once.
- `app/(tabs)/quiz.tsx:209-237` has no finish lock. Repeated “See Results” taps can double-record a quiz.
- Quiz completion writes daily stats and the quiz session separately. A failure between `recordStudy` and `saveQuizSession` leaves inconsistent totals.
- `lib/db/schema.ts` has no migration version (`PRAGMA user_version`) and no migration runner. Future schema changes cannot be safely rolled out.
- SQLite foreign keys are not enabled. `deleteSubject` and `deleteNote` can leave orphaned flashcards; deletes are not transactional.
- `lib/srs.ts:47-51` maps “Hard” to quality 2, and the algorithm treats every quality below 3 as a failure/reset. “Hard” and “Again” therefore have the same scheduling outcome.
- Database startup failure is only logged in `app/_layout.tsx:19-23`. Screens have no app-level error boundary, recovery UI, or retry path.
- `clearAllData` deletes SQLite rows but not AsyncStorage settings, despite the user-facing “Clear all data” wording.

## P1 Quality Work Before Submission

- Add unit tests for SRS ratings, streaks across timezone/DST boundaries, question-bank invariants, and database CRUD/cascade behavior.
- Add at least one automated critical-path test: fresh install -> create/edit note -> quiz -> flashcard review -> progress -> process restart -> clear data.
- Add `typecheck`, `lint`, `test`, and release-check scripts plus CI. The project currently has none.
- Add error/loading/empty states for every async database read and write; do not leave a failed flashcard load spinning forever.
- Add button busy states and user-visible errors for save/delete/finish actions.
- Respect the operating-system Reduce Motion preference by default; keep the manual animation override.
- Test dynamic type. Fixed-height flashcards (`h-72`) can overflow with large accessibility fonts or long content.
- Verify the floating mascot and speech bubble do not cover controls on small phones, keyboards, landscape/scaled iPad compatibility mode, and large text.
- Remove unused release surface: `expo-secure-store`, `@shopify/flash-list`, dead settings fields, and unused database APIs, unless they become part of v1.
- Add a README with clean-checkout setup, release commands, environment rules, support owner, rollback, and incident response.
- Add crash reporting only if its data collection is fully disclosed. At minimum, define a support inbox and review process.

## Store Asset Gaps

- The seven existing screenshots are Playwright web captures at **390 x 844**. They exceed Google Play’s 2:1 dimension ratio, are below the recommended 1080 x 1920, and are not native-device captures.
- Google Play feature graphic **1024 x 500** is absent.
- Google Play store icon **512 x 512** is not prepared as a separate listing asset.
- Apple screenshots for accepted iPhone display sizes are absent.
- `ios.supportsTablet` is `true`, so native iPad QA and iPad App Store screenshots are required. For the deadline, set it to `false` unless iPad support is genuinely tested and intended.
- The 1024 x 1024 iOS app icon exists and sampled as fully opaque, which is a good starting point.
- The splash image exists but is not configured through the Expo splash-screen plugin.

## Store Console Checklist

### Google Play

- Active, identity-verified developer account; confirm whether the 12-testers/14-days rule applies.
- Final package name, signed AAB, Play App Signing, internal test, pre-launch report, then production application.
- Main listing: honest title, 80-character short description, full description, 512 icon, 1024 x 500 feature graphic, and native screenshots.
- App Content: Data Safety, privacy policy URL, ads declaration, app access instructions, target audience, IARC content rating, Health Apps declaration, and government-affiliation declaration where prompted.
- Declare Medical Reference and Education for the NLE content. Add the required non-medical-device disclaimer and healthcare-professional reminder to the listing and in-app legal screen.
- If AI is later enabled: server-side key custody, safety filtering, rate limiting, and an in-app way to report/flag offensive AI output are required.
- Target API is not a blocker after SDK 56 alignment: Expo SDK 56 targets API 36.

### Apple App Store

- Active Apple Developer membership, agreements accepted, App Store Connect record, final bundle ID/SKU, and signing credentials.
- Build with Xcode 26+ / iOS 26 SDK. Expo SDK 56 uses Xcode 26.4+ and is compatible after dependency/config fixes.
- App Privacy answers must match actual SDK behavior. For the current offline app, verify the final binary and likely declare no collection; do not assume this after adding analytics, crash reporting, updates, or AI.
- Required metadata: privacy policy URL, support URL, description, keywords, category, age rating, content rights, copyright, review contact, and review notes.
- Remove all placeholders before review. Apple explicitly rejects placeholder content and incomplete binaries under Guideline 2.1.
- Add medical-reference disclaimer, qualified content review, sources/version dates, and a reminder to consult a healthcare professional.
- Validate generated privacy manifests and required-reason API declarations during App Store Connect upload.
- Use TestFlight for beta distribution; do not submit a beta or trial build to the public App Store.

## Verification Evidence

- Inspected all **58 owned TypeScript/TSX/JS/JSON/CSS files** (about **5,924 lines**) plus assets, Git state, package lock, screenshots, and project memory.
- `npx tsc --noEmit`: **pass**.
- `npx expo export --platform all --clear`: **pass** for Android, iOS, and web bundles.
- Expo Doctor: **18/21 pass; 3 checks fail** (config schema, missing `expo-font`, four package patch mismatches).
- `npm audit --omit=dev`: **10 moderate findings** through Expo build tooling (`xcode` -> old `uuid`). Do not run the proposed breaking `npm audit fix --force`; recheck after the required Expo patch update.
- No hardcoded API keys, secrets, network calls, analytics, ads, payment code, authentication, or cloud backend were found.
- No native AAB/IPA build, on-device run, E2E test, CI run, store pre-launch report, TestFlight result, or store review result was available.
- Git is on `main` with only two commits. The current launch candidate has 17 modified tracked files plus untracked launch artifacts and is not committed or tagged.

## July 17-20 Rescue Schedule

### Friday, July 17: Scope And Build Gate

1. Lock the offline-v1 scope and remove unsupported/placeholder claims.
2. Fix Expo Doctor to 21/21; set final identifiers, versions, encryption declaration, splash config, and EAS profiles.
3. Fix duplicate writes, unsupported board fallback, 20-question mismatch, migrations/FKs, and error recovery.
4. Publish privacy/support pages and add in-app legal/support/medical screens.
5. Produce Android and iOS internal release builds.

### Saturday, July 18: Native QA And Content Gate

1. Test physical Android plus TestFlight/internal iOS on small and large phones; test iPad only if retained.
2. Complete the critical-path matrix in normal, airplane, process-killed, fresh-install, and large-text states.
3. Have a qualified reviewer sign off NLE content; source and date all medical/tax/legal questions.
4. Capture native screenshots and create all store assets.

### Sunday, July 19: Submission Gate

1. Run final typecheck, tests, Expo Doctor, production builds, install tests, and store validators.
2. Freeze the release commit, tag it, record EAS build IDs and checksums, and prepare rollback/support notes.
3. Submit only if every P0 item is closed. Otherwise keep the build in internal testing.

### Monday, July 20: Honest Launch

- Launch internal beta and publish only the distribution state that actually exists.
- If either store has approved the app, release it there. Do not claim “available on both stores” until both storefront links work.
- If Google’s 14-day personal-account test applies, July 20 is the start of closed testing, not public production.

## Primary Policy Sources

- [Expo SDK 56 reference](https://docs.expo.dev/versions/v56.0.0/)
- [Expo app store best practices](https://docs.expo.dev/distribution/app-stores/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple upcoming submission requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Google Play production testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play Health Apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Google Play Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511)
- [Google Play AI-generated content](https://support.google.com/googleplay/android-developer/answer/13985936)
- [Google Play preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151)
