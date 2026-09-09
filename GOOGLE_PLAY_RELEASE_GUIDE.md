# Kwagi Google Play release guide

Prepared September 9, 2026 for `com.stackwise.kwagi`. This is the exact path from the current repository to a public Play Store release. Checked boxes are complete in source; owner/provider steps remain unchecked.

## Current release position

- [x] Package ID is fixed as `com.stackwise.kwagi`.
- [x] Expo SDK 57 targets Android 16 / API 36, which meets Google Play's requirement effective August 31, 2026.
- [x] Production EAS profile outputs an Android App Bundle and increments version codes remotely.
- [x] Generated Android manifest blocks legacy storage and overlay permissions, disables Android cloud backup, and retains only Internet and vibration.
- [x] Store icon and feature graphic have the required dimensions.
- [x] Listing copy, release notes, privacy text, support content, Data safety answers, and declaration guidance are prepared.
- [x] Automated Play policy scan found no active policy risk in the analyzed domains.
- [x] Repository release gate passed before this store-preparation pass: lint, TypeScript, 28 tests, Expo Doctor 21/21, and Android/iOS/web exports.
- [x] Privacy and support pages are public. GitHub Pages deployment `34293982126` completed successfully and all three configured URLs returned HTTP 200.
- [ ] Signed production AAB exists. EAS cannot build it until the owner signs in on this machine.
- [ ] Native Android critical-path test and screenshots are complete.
- [ ] Play Console account, app record, declarations, testing, review, and rollout are complete.

## Step 1: Finish the Google Play developer account

1. Open [Google Play Console](https://play.google.com/console/) using the Google account that will permanently own Kwagi.
2. Pay the one-time registration fee if the account is not active.
3. Complete identity, contact email, and phone verification. Organization accounts may require organization and website verification. New personal accounts may also require device verification using the Play Console mobile app on a non-rooted Android 10+ phone.
4. Note whether the account is a personal account created after November 13, 2023. If it is, production access requires a closed test with at least 12 testers continuously opted in for 14 days.
5. Use a monitored public developer email. Enter the same support contact in the store listing. Do not put credentials or private backup files in support tickets.

Owner evidence to record: developer account type, creation date category, verified developer name, verified contact email, device-verification status, and whether the 12-testers/14-days gate applies.

## Step 2: Create the app record

1. In Play Console, choose **Create app**.
2. Enter **Kwagi: Notes & Flashcards** as the Play listing name. The installed app name remains Kwagi.
3. Choose the listing's default language, **App**, **Free**, and accept only the declarations that are true for this release.
4. Confirm the package name shown after the first bundle upload is exactly `com.stackwise.kwagi`. A Play package name cannot be changed after creation.
5. Enable Play App Signing during the first release setup.

## Step 3: Publish policy and support pages

The source pages are under `docs/`. They were published from commit `2368991aed748da836f14a0b80986dade58052c6` by the successful **Publish policy and support pages** workflow run `34293982126`. Recheck all three URLs before every submission:

- `https://tsutsu03.github.io/kwagi-app/`
- `https://tsutsu03.github.io/kwagi-app/privacy/`
- `https://tsutsu03.github.io/kwagi-app/support/`

The repository Pages source is set to **GitHub Actions**. Keep the privacy URL public, active, non-geofenced, and readable without a login.

## Step 4: Sign in to Expo and link the project

From `C:\CodingProjects\Kwagi`:

```powershell
npx.cmd --yes eas-cli@latest login
npx.cmd --yes eas-cli@latest whoami
npx.cmd --yes eas-cli@latest init
npx.cmd --yes eas-cli@latest project:info
```

Use the Expo organization/account that should own the app long term. `eas init` adds `extra.eas.projectId` to `app.json`. Commit that public project ID. Do not add Expo access tokens or Google service-account JSON to Git.

## Step 5: Produce an installable Android beta

```powershell
npx.cmd --yes eas-cli@latest build --platform android --profile preview
```

This creates an APK for device testing, not Play submission. Download it from the EAS build page. Install it on at least one supported physical Android phone. Record the EAS build ID, artifact URL, device model, Android version, app version, commit SHA, and tester.

Test all of these on the APK:

1. Fresh install and onboarding.
2. Create, edit, and delete subjects, notes, and cards.
3. Generate cards from note lines and confirm duplicates are not created.
4. Complete a quiz and a due-card review; confirm XP, goal, streak, timing, and history update once.
5. Close the app from recents, relaunch it, and confirm data persists.
6. Export a backup, add or edit data, restore the backup, relaunch, and confirm the restored state.
7. Test airplane mode for every core flow.
8. Test large font, dark/light theme, Android back, keyboard avoidance, TalkBack, and Reduce Motion.
9. Leave and return to a quiz/review; confirm background time is not counted.
10. Review startup, scrolling, crashes, and obvious ANRs on the device.

Fix any release-blocking issue and repeat the whole relevant flow on a new APK.

## Step 6: Capture native store screenshots

Use the tested Android APK or the Play internal-testing build. Capture portrait phone screenshots with no personal notes or notification overlays. Recommended order:

1. Home: due review and today's progress.
2. Notes: subjects and saved notes.
3. Study: quiz choices or flashcard review.
4. Cards: searchable card library and due state.
5. Progress: activity history and streak.

Upload at least four polished phone screenshots, the prepared 512x512 icon, and the 1024x500 feature graphic. Check every image at 100% and on a phone-sized preview. Existing `qa-screenshots/` files are browser evidence and should not be uploaded as native screenshots.

## Step 7: Build the signed Play bundle

After the APK passes:

```powershell
npx.cmd run release:check
npx.cmd --yes eas-cli@latest build --platform android --profile production
npx.cmd --yes eas-cli@latest build:list --platform android --limit 5
```

Allow EAS to create and securely store the Android upload key if no key already belongs to this package. Back up the credential ownership details. The production result must be an `.aab`, not an APK. Record build ID, version name, version code, commit SHA, target API, and artifact URL.

Before uploading, inspect the bundle in Play Console or Android Studio's APK Analyzer. Confirm package `com.stackwise.kwagi`, version code greater than every prior upload, target API 36, no unexpected sensitive permissions, and no native-library compatibility warning.

## Step 8: Upload to internal testing

For the first release, manual upload is the clearest route:

1. Play Console > **Test and release > Testing > Internal testing**.
2. Create a release and enable Play App Signing when prompted.
3. Upload the EAS `.aab`.
4. Use release name `1.0.0 (1)` and the prepared release notes.
5. Add internal tester emails or a Google Group.
6. Save, review, and roll out to internal testing.
7. Install from the Play opt-in link, then repeat the critical-path smoke test. This validates Play signing and delivery, which the standalone APK does not.
8. Review Play's automated pre-launch report, App Bundle Explorer, policy status, crashes, ANRs, accessibility findings, and device compatibility. Resolve release-blocking findings before promotion.

Automated EAS submission can be added after the first app record and service account exist. Create a least-privilege Google service account in the linked Google Cloud project, grant only the required Play release permissions, keep its JSON outside the repository, and use the `internal` submit profile. The `.gitignore` blocks common key filenames.

## Step 9: Complete the store listing and declarations

Copy the reviewed fields from `store/listing.md` and `store/google-play-console-answers.md`.

1. Main store listing: title, short description, full description, icon, feature graphic, native screenshots, category, tags, email, website, and privacy policy.
2. App access: unrestricted; no login instructions.
3. Ads: no.
4. Data safety: no collection and no sharing for this exact binary.
5. Target audience: 18+ and not directed to children.
6. Content rating: complete IARC using the actual app content.
7. News, government, health, financial, and AI declarations: no/none as documented.
8. Countries/regions: choose the intended launch market. The prepared recommendation is Philippines first.
9. Pricing: free, with no in-app products or subscriptions.
10. Content rights and developer program declarations: the owner must read and accept them; confirm the owl artwork, fonts, and all listing assets are owned or properly licensed.

Do not copy a declaration blindly if the binary or business model changes.

## Step 10: Satisfy the required testing track

If the account has the new-personal-account gate:

1. Complete app setup so closed testing is available.
2. Create a closed-testing release from the verified AAB.
3. Add at least 12 real testers and give them the opt-in link.
4. Keep at least 12 testers continuously opted in for 14 full consecutive days. If someone opts out, their continuous period resets.
5. Collect private feedback and record what was tested, defects found, fixes made, device coverage, and engagement.
6. After the requirement is met, apply for production access from the Play Console dashboard and answer the testing/readiness questions truthfully.

Internal testing does not replace this closed-test requirement. Open testing becomes available after production access.

## Step 11: Create the production release

1. Promote the exact tested bundle or create a new production AAB only if fixes were made.
2. If you create a new AAB, increment the version code and repeat internal/closed testing for the changed areas.
3. Open **Production > Create new release**. Select the tested bundle, add release notes, and resolve every Console error.
4. Choose a staged rollout rather than an immediate 100% release for the first public version when the Console permits it. A cautious starting point is 10% after review, followed by deliberate increases based on crash/ANR and user feedback.
5. Send the release for Google review. Record the submission date and status.
6. Do not announce availability while the status is only uploaded, in review, or approved. Verify the public Play listing and installation path first.

## Step 12: Verify and operate the live release

1. Open the public listing while signed out and from a supported Philippine device/account.
2. Install the Play-delivered build, verify version/package, and repeat the smoke test.
3. Monitor Android vitals, policy status, reviews, support issues, and rollout health daily during the first week.
4. Halt the rollout for data loss, startup crashes, broken backup/restore, or a severe accessibility/navigation regression.
5. For every update, increase version code, rerun release checks, test the signed build, update Data safety/declarations if behavior changed, and preserve a release record.

## Evidence record to maintain

For each release, keep: source commit, clean diff review, `npm run release:check` result, dependency-audit result, EAS project/build IDs, version name/code, signing owner, AAB hash, device test matrix, pre-launch report, listing/declaration snapshot, Play track, submission status, rollout percentage, public URL, and post-release vitals.

## Current blockers requiring the owner

1. Sign in to the permanent Expo account on this machine so EAS can link and build.
2. Confirm the Google Play developer account type and complete identity/contact/device verification.
3. Create the Play Console app record and enter the monitored support email.
4. Supply real tester emails if the 12-testers/14-days rule applies.
5. Review and accept Google agreements, content rating, Data safety, Play App Signing, country/pricing, and production rollout choices in the Console.
