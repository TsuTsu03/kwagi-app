# Kwagi

Kwagi is a local-first study companion built for focused, low-pressure review. It helps learners keep notes, review flashcards, take quizzes, and see their progress in one mobile app.

## What it includes

- A home screen with study activity and encouragement from Kwagi, the owl guide
- Notes, flashcards, quizzes, and progress views
- Spaced-repetition review scheduling
- Local SQLite storage for study content and progress
- Android, iOS, tablet, and web support through Expo

## Run locally

Prerequisites: a current Node.js LTS release and npm. Install Android Studio for Android emulation or Xcode on macOS for iOS simulation.

```bash
npm install
npm run start
```

Then choose a target from the Expo developer tools, or run one directly:

```bash
npm run android
npm run ios
npm run web
```

## Project structure

```text
app/                 Expo Router screens and tab navigation
components/          Reusable interface, quiz, and mascot components
constants/           Theme, study content, dialogue, and level data
lib/                 Study logic, local database access, and state helpers
assets/              App, splash, and adaptive-icon assets
```

## Data and privacy

Kwagi stores its study data locally on the device using SQLite. This repository does not require a backend or runtime environment variables to start the app. Do not add provider credentials to the mobile bundle or commit local secrets.

## Stack

- Expo and React Native
- Expo Router
- Expo SQLite and SecureStore
- NativeWind
- Zustand

## License

See [LICENSE](LICENSE).
