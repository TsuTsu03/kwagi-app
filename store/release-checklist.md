# Store release checklist

## Code gate

- [x] `npm run release:check` passes on the current candidate; rerun it on the eventual release commit.
- [ ] Android preview build installs and completes the critical path on a physical phone.
- [ ] iOS production/store build installs through TestFlight and completes the critical path on a physical phone.
- [ ] Fresh install, airplane mode, process restart, large text, and Reduce Motion checks pass.
- [x] Automated QA confirms Clear all data returns to onboarding and removes user-created content and preferences.
- [x] Expo Go launches and renders the SDK 57 app on an Android 17 / API 37 emulator without captured React Native or Android runtime errors. This is not signed-build or physical-device evidence.

## Google Play

- [ ] Developer account and identity are verified.
- [ ] Confirm whether the 12-testers-for-14-days rule applies.
- [ ] Upload signed AAB and complete Play App Signing.
- [ ] Complete Data Safety, ads, app access, target audience, content rating, and all required declarations.
- [ ] Upload 512 px icon, 1024 x 500 feature graphic, and native Android screenshots.
- [ ] Run internal testing and review the pre-launch report.

## Apple

- [ ] Apple Developer agreements and App Store Connect record are complete.
- [ ] Upload signed build made with the required iOS SDK and Xcode version.
- [ ] Complete App Privacy, age rating, content rights, review contact, and review notes.
- [ ] Upload accepted native iPhone screenshots.
- [ ] Complete TestFlight internal testing before App Review submission.

## Release record

- [ ] Record commit SHA, tag, EAS project ID, Android build ID, and iOS build ID.
- [ ] Record tester/device matrix and known limitations.
- [x] Public root, privacy, and support URLs returned HTTP 200 after GitHub Pages workflow run `34293982126`.
- [ ] Do not announce store availability until each storefront link works.
