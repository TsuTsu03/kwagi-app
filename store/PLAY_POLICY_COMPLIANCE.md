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

## Manual gates

The scan cannot approve legal declarations or predict Google review. The owner must make the Console answers match the exact signed bundle, complete IARC content rating, verify asset rights, accept Play App Signing and developer agreements, and repeat this review if an SDK or networked feature is added.

See `google-play-console-answers.md` for field-by-field entries and `../GOOGLE_PLAY_RELEASE_GUIDE.md` for the release order.
