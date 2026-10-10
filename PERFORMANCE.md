# Kwagi performance and stress results

Measured October 10, 2026. Run `npm run stress` (or `npm run stress -- quick`) to repeat the data-layer tests; it uses the app's real readers, queries, and backup code over `node:sqlite`.

What these numbers are and are not:

- **Data layer (Node):** real app code and real SQLite, but Node's JIT runs JavaScript roughly 3 to 10 times faster than Hermes on a phone, and `expo-sqlite` adds per-row bridge cost. Treat these timings as lower bounds.
- **UI (browser):** the web build in Chromium with the CPU slowed 6x to approximate a budget phone. React Native Web is not the native renderer, so use these for before/after comparison, not as device numbers.
- **Not measured:** native Android or iPhone builds, photo OCR, PDF reading, and real storage/memory limits. These need physical-device testing.

## Library sizes tested

| Library | Subjects | Notes | Cards | Quiz answers | Database file | Backup file |
| --- | --- | --- | --- | --- | --- | --- |
| New student (1 term) | 5 | 100 × 2k chars | 1,000 | 1,000 | 0.9 MB | 0.9 MB |
| Active student (2 years) | 12 | 1,000 × 5k chars | 10,000 | 12,000 | 9.8 MB | 12 MB |
| Power user (4 years) | 30 | 4,000 × 5k chars | 40,000 | 50,000 | 40 MB | 49 MB |
| Heavy importer | 6 | 200 × 100k chars | 4,000 | 4,000 | 21 MB | 22 MB |

## Problems found and fixed

| Problem | Before | After |
| --- | --- | --- |
| Restore rejected any backup over 10 MB, but export had no limit. An active 2-year student could export a backup they could never restore. | 12 MB, 22 MB, and 49 MB backups rejected | All restore (49 MB in 3.6 s in Node). Limits are now 120 MB / 1M records, with a regression test |
| Backup restore by pasting text. A 6.4 MB paste froze the browser for over 2 minutes; Android share-sheet text is capped near 1 MB | Unusable above roughly 1 MB | Backups are saved and restored as files (`expo-sharing`, document picker). Pasting remains for small backups |
| Opening a subject loaded every note's full text and rendered every note | 1,500 notes: 71 s to first note (6x CPU), 6.4 MB of text loaded | 1.4 s; only 240-character previews load; virtualized list renders about 12 rows |
| Note search filtered all full text in JavaScript on every keystroke | 10.7 s for 2 keystrokes (6x CPU) | 2.4 s, debounced and run in SQLite |
| Importing huge files cleaned the whole text before cutting it to one note | 25 MB text: 3.9 s and 381 MB heap | 7 ms and 3.5 MB heap; readers stop once the note limit is covered |
| Quiz setup shuffled the whole deck for every question's wrong answers | 40k cards: 325 ms | 37 ms |

## Remaining limits and risks

- **One note holds up to 100,000 characters (about 30 to 40 pages).** Bigger imports keep the first part and say so. Splitting a large PDF into several notes is a possible next step.
- **Typing in a 100,000-character note** took about 180 ms per keystroke in the throttled browser. Check on a real phone; if it lags, lower the per-note limit or split imports.
- **Card library and quizzes load every matching card** (40k cards: about 220 ms in Node). Rows are virtualized, but a SQL-paged card library is the next step past about 40k cards.
- **Backups of very large libraries** (around 50 MB) are parsed in memory. That should be fine on most phones but needs a test on a low-RAM Android device.
- **Kept originals use phone storage.** Kept photos are resized to about 1 MB; PDFs and Office files are stored as-is (up to 100 MB for PDFs). Kwagi refuses to keep files when less than 200 MB would remain free, and Settings > Storage shows use per subject. Lecture recordings (planned) are estimated at 15 to 30 MB per hour of speech-quality audio.
