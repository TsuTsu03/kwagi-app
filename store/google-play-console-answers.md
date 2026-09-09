# Google Play Console answer sheet

Prepared September 9, 2026 for package `com.stackwise.kwagi`, version `1.0.0`. These answers match the current source and generated Android manifest. Recheck them against the signed AAB before submission.

## App setup

- App name: **Kwagi: Notes & Flashcards**
- Default language: **English (United States)**, unless the owner wants a Philippine-English listing
- App or game: **App**
- Free or paid: **Free**. Google does not allow a paid app to become free and later return to paid.
- Category: **Education**
- Tags: choose only relevant tags offered by the Console, such as study guide, education, or exam preparation. Availability changes in the Console.
- Contact email: **OWNER MUST ENTER AND VERIFY A MONITORED EMAIL ADDRESS**
- Website: `https://tsutsu03.github.io/kwagi-app/`
- Privacy policy: `https://tsutsu03.github.io/kwagi-app/privacy/`
- Support URL: `https://tsutsu03.github.io/kwagi-app/support/`

## App content declarations

| Play Console section | Answer for this binary | Evidence or note |
| --- | --- | --- |
| Ads | No | No ad SDK or ad surface |
| App access | All functionality is available without special access | No account, login, subscription, location, or organization restriction |
| Data safety: collects data | No | Study data and preferences stay on device; no analytics, crash SDK, account, sync, or app server |
| Data safety: shares data | No | User-triggered backup export goes to a destination the user chooses and is not sent to the developer |
| Account creation | No | Do not provide an account-deletion URL; there are no accounts |
| Target audience | Ages 18 and over | Product is for college students and general adult study; it is not directed to children |
| News app | No | Study utility |
| Government app | No | Independent study utility |
| Health app | No | No health feature or seeded medical advice; user-entered study text does not make the app a health app |
| Financial features | None | No payments, lending, banking, investing, crypto, or financial advice |
| AI-generated content | No | No AI service or generative feature |
| In-app purchases | No | No billing library or paid content |
| App access instructions | No instructions required | Reviewers can launch the app and use all features offline |

For the content rating questionnaire, answer from the current binary: no violence, sexual content, profanity, controlled substances, gambling, user-to-user communication, public user-generated content, location sharing, or digital purchases. The local notes a user writes are private device content, not an in-app public UGC system. Confirm every answer in the questionnaire before submitting because Google controls the final IARC rating.

## Data safety wording

Use **No data collected** and **No data shared with third parties** for this binary. Local SQLite notes, cards, quiz history, and AsyncStorage preferences do not leave the device. Android cloud backup is disabled. The only export is initiated by the user through Backup and restore.

If analytics, crash reporting, accounts, cloud sync, advertising, payments, push tokens, AI, or a remote API is added later, redo the Data safety form before uploading that update.

## Store listing assets

- App icon: `store/assets/google-play-icon-512x512.png`, verified 512x512.
- Feature graphic: `store/assets/google-play-feature-graphic-1024x500.png`, verified 1024x500.
- Phone screenshots: capture at least four from the signed or internal Android build. Use Home, Notes, Study/quiz, and Progress. Do not use the existing browser QA captures as native Android proof.
- Screenshot alt text: keep each description under 140 characters and describe the visible task, for example: `Study dashboard showing due flashcards, daily goal, streak, and XP.`
- Preview video: optional for the first release.

## Release setup

- Countries/regions: start with **Philippines** unless the owner chooses broader distribution after checking local legal/support coverage.
- Release name: `1.0.0 (1)` for the first accepted version code.
- Release notes: use the text in `store/listing.md`.
- Play App Signing: accept for the app and preserve the upload key/credential owner record.
- Testing order: internal test, closed test if the account requires it, then production draft and staged rollout.
