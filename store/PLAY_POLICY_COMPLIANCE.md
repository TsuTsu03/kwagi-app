# Google Play policy review

Reviewed September 9, 2026 for package `com.stackwise.kwagi` and the current offline `1.0.0` source candidate.

## Result

The automated policy scan found no active violation or off-device data transmission in the reviewed source. Apparent matches for recordings, files, music, messages, and user IDs were semantic false positives from database records, local test files, icon names, a removed legacy table, and locally generated row IDs.

The generated Android manifest was separately reviewed. App configuration blocks legacy read/write storage and system-overlay permissions and disables Android system backup. Internet and vibration remain because Expo/runtime and haptic behavior use them. Recheck the effective manifest and Data safety summary from the signed AAB in Play Console before submission.

## Declaration for this binary

- No ads.
- No account creation or login.
- No data collected by the developer.
- No data shared with third parties by the developer.
- No analytics, crash-reporting service, cloud sync, remote API, payments, push tokens, or AI service.
- User-triggered backup export uses the Android share sheet; the user chooses the destination.
- All app features are available without special reviewer access.
- Target audience is ages 18 and over.

## Note import update (October 10, 2026)

- New Android permission: `CAMERA`, used only when the student taps Take photo. `RECORD_AUDIO` stays blocked; legacy storage permissions stay blocked because the system photo and document pickers need no storage permission.
- New SDK: Google ML Kit text recognition through Google Play services, configured to install its model with the app. Images are processed on the device. ML Kit may download models and send Google API usage and performance metrics, so recheck the Data safety answers (see `google-play-console-answers.md`).
- PDF text uses PDFBox-Android (Apache 2.0) on Android and PDFKit on iOS. Word, PowerPoint, and text files are read in JavaScript. Kwagi deletes its temporary file copies after reading them, and only the reviewed note text is saved.
- Optional "Keep original photos and files" stores copies in the app's private documents folder on the device. Nothing is uploaded; JSON backups exclude these files. Android system backup stays disabled.
- Sound effects (`expo-audio`, playback only) add the normal `MODIFY_AUDIO_SETTINGS` permission. The `expo-audio` config plugin is intentionally not used, so `RECORD_AUDIO` stays blocked until lecture recording ships.
- Expo Doctor's React Native Directory check excludes `expo-text-extractor`, `@paul_sizon/expo-pdf-text-extract`, and `fflate`. Their source was reviewed by hand. Rebuild and test both native platforms before relying on them.

## Manual gates

The scan cannot approve legal declarations or predict Google review. The owner must make the Console answers match the exact signed bundle, complete IARC content rating, verify asset rights, accept Play App Signing and developer agreements, and repeat this review if an SDK or networked feature is added.

See `google-play-console-answers.md` for field-by-field entries and `../GOOGLE_PLAY_RELEASE_GUIDE.md` for the release order.
