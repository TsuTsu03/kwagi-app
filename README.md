# Kwagi

Kwagi is an offline study app for college students. Users organize notes, create flashcards from structured note lines, review due cards with spaced repetition, build quizzes from their own cards, and track local progress.

The current release has no account system, ads, analytics, payments, cloud sync, or AI service.

See [the current audit](CODEBASE_AUDIT.md) for findings and verification, and [the development plan](DEVELOPMENT_PLAN.md) for priorities and acceptance criteria. Store availability is not established by a local build.

For Android submission, follow the [Google Play release guide](GOOGLE_PLAY_RELEASE_GUIDE.md) and copy the reviewed Console fields from [the Google Play answer sheet](store/google-play-console-answers.md).

## Requirements

- Node.js 22.13 or newer
- npm
- Android Studio for local Android builds
- macOS with Xcode 26.4 or newer for local iOS builds
- Expo and store developer accounts for EAS distribution

## Clean setup

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run doctor
npm.cmd run export
```

Run the app with `npm.cmd start`, `npm.cmd run android`, `npm.cmd run ios`, or `npm.cmd run web`.

## Release checks

`npm.cmd run release:check` runs lint, TypeScript, unit tests, Expo Doctor, and clean Android/iOS/web exports. A release candidate is not ready until this command passes and both native internal builds pass physical-device smoke tests.

## EAS builds

```powershell
npx.cmd eas-cli whoami
npx.cmd eas-cli init
npx.cmd eas-cli build --profile preview --platform android
npx.cmd eas-cli build --profile production --platform ios
```

The Android preview profile creates an installable internal APK. The iOS production profile creates a store-distribution build suitable for App Store Connect and TestFlight. Record build IDs and artifact links in the launch audit. Do not submit until store metadata, policy URLs, screenshots, account declarations, and native QA are complete.

## Data and environment rules

Kwagi stores app data in SQLite and preferences in AsyncStorage. No runtime secrets or environment variables are required. Never add provider keys to the mobile bundle. Exported backups can contain private study content and must not be attached to public support requests.

## Support and incident response

- Support page: <https://tsutsu03.github.io/kwagi-app/support/>
- Privacy Policy: <https://tsutsu03.github.io/kwagi-app/privacy/>
- Support owner: repository owner until a dedicated support inbox is assigned

For a data-integrity incident, pause submission, reproduce on the same app version, preserve a user-controlled backup where possible, fix forward with a tested migration, and distribute through internal testing first. For a release regression, stop rollout in the store console and restore the last verified build.

## Rollback

Store releases cannot downgrade local schemas safely unless migrations remain backward-compatible. Stop rollout before deleting or renaming persisted fields. Keep the previous approved store build available and document every schema version in `lib/db/client.ts`.
