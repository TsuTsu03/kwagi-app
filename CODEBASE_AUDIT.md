# Kwagi codebase audit

September 9, 2026. Audit target: the complete current workspace, including the substantial uncommitted July candidate. Historical launch claims were checked against source rather than treated as current release evidence.

## Coverage and architecture

| Area | Reviewed |
| --- | --- |
| App entry and navigation | Root hydration/DB initialization, onboarding, tabs, hidden legacy chat redirect, pushed settings/legal/backup routes |
| Study flows | Home, subjects/notes/editor, card library, quiz builder/session, spaced review, progress and coaching |
| Persistence | Every `lib/` module: SQLite schema/migrations/transactions, subjects/notes/cards, quiz history, daily stats, settings queue, backup, IDs/date/SRS/generation |
| Design | Shared UI components, owl components, animation/theme/tablet hooks, CSS/Tailwind tokens, layouts and states |
| Delivery | Package/lockfile, Metro/Babel/TypeScript/lint config, app identifiers/EAS profiles, generated Android manifest, CI/Pages workflows, scripts, tests, README, Play release guide, store checklist/listing, legal/support sources, previous launch audit |

This is an Expo Router application with SQLite study data and AsyncStorage preferences. There is no production server, account system, payment provider, cloud sync, or AI endpoint in the current implementation. Local study text is rendered as text, and SQL values use bound parameters. Build tooling and external policy/support links are separate from study-data storage.

## Findings addressed

| Priority | Finding | Improvement |
| --- | --- | --- |
| P1 | A partial backup could be accepted, clear all tables, and silently skip missing data | Full validation before storage access, relationship/type checks, strict inserts and rollback tests |
| P1 | Native transaction connections did not inherit foreign-key enforcement | Dedicated connection enables foreign keys before transaction start; actual SQLite regression coverage |
| P1 | Rating a deleted/paused/changed card could record undeserved progress | Validate fresh active due card inside the write transaction before schedule/progress updates |
| P1 | Expo Doctor flagged the SDK 56 Hermes memory regression | Upgrade to Expo 57.0.21, React Native 0.86.3 and their matched native modules; Doctor now passes |
| P2 | Browser alerts did nothing, blocking delete/restore confirmations and hiding errors | Platform-aware alerts; explicit inline backup confirmation and status |
| P2 | Web export depended on Web Share support | JSON download plus readable/copyable export fallback |
| P2 | Intentionally empty libraries were seeded again on cold launch | Seed only during initial database creation |
| P2 | Quiz could contain only one answer choice | Require two distinct normalized answers and valid session size |
| P2 | Quiz first-question thinking time was omitted; background time counted; reviews omitted duration | Shared foreground timer with tests; per-question and per-review timing |
| P2 | Card library silently hid records beyond 500 | Remove implicit cap; use virtualized rows |
| P2 | New cards silently used the first subject | Explicit subject selection; reassignment detaches an old note link when moving subjects |
| P2 | Editor back action lost unsaved text | Discard confirmation plus Android back handling and keyboard-safe editor layout |
| P2 | Dashboard review CTA opened a generic chooser | Direct scheduled review route with consumed mode parameter |
| P2 | Mixed card/quiz activity was labeled as cards | Goal copy consistently describes study items |
| P2 | Both palettes had low-contrast helper text; desktop used a stretched single column | Updated tokens, calm opaque backgrounds, responsive study dashboard and balanced tabs |
| P2 | Flashcard accessible label omitted content and hidden side leaked into web accessibility tree | Visible question/answer label and hidden-side accessibility exclusion |
| P2 | Motion preferences and animated counters could produce inconsistent feedback/stale values | Shared press/flip motion handling and CountUp synchronization |
| P2 | Animated button faces lost layout styles in the browser; tab selection was absent from the DOM | Explicit animated-view styles and selected-tab ARIA state, verified visually and in the DOM |
| P2 | XP labels implied board-exam readiness; coaching claimed continuous study from daily totals | Course-neutral levels and factual cumulative-time wording |
| P2 | Local Claude configuration was tracked | Ignore `.claude/` and remove its existing settings file from the index while retaining the local copy |
| P2 | Expo prebuild added legacy storage and overlay permissions and allowed Android system backup | Block legacy storage and overlay permissions in app config and disable Android cloud backup; regenerate the native manifest to verify removal directives |
| P2 | Play privacy and support URLs returned 404 | Publish the policy/support site through GitHub Pages; successful workflow run `34293982126` and HTTP 200 checks |

## Remaining limitations and next work

- **Native evidence:** physical Android/iPhone builds, screen readers, keyboard/large-text behavior, native sharing and lifecycle/storage-failure testing remain required. Node SQLite tests exercise SQL semantics and adapters, not a physical Expo binary.
- **Dependencies:** the final SDK 57 npm audit reports 14 moderate findings, zero high and zero critical. These are propagated through `decode-uri-component`/`query-string`/Expo Router and `uuid`/`xcode`/Expo tooling. The advertised automatic fixes downgrade Expo/Router outside the supported stack. No forced downgrade or untested major override was applied. Resolve or explicitly review these before promotion.
- **Restore crash boundary:** ordinary SQL/preference errors compensate, but SQLite and AsyncStorage do not share a transaction across process termination. A unified store or durable recovery journal is planned.
- **Draft persistence:** editor-back confirmation protects that action; process death/browser refresh can still lose an unsaved draft. Tabs retain in-memory state, not a durable draft.
- **Scale:** rows are virtualized and no longer hidden after 500, but library search still loads/filter cards in memory. Device measurements should drive SQL pagination/search.
- **Backup compatibility:** strict current-format validation; limits are 10 million text characters and 100,000 records. Old incomplete exports need explicit migration tooling, not permissive destructive restore.
- **Review scope:** due review currently draws from all subjects in batches of 30. “Session complete” no longer claims all due cards are exhausted.
- **Product copy:** coaching retains existing Taglish; localization settings are not a complete translated UI. Gamification is engagement feedback, not academic certification.
- **Release:** policy/support pages are deployed. A signed AAB, physical Android test, Play Console declarations/testing, review, and public availability still require provider and owner evidence.

## Verification record

On Windows with Node 24.18, the final candidate passed `npm run release:check`: lint, TypeScript, 28 tests, Expo Doctor (21/21), and clean Android/iOS/web exports (exit 0). A separate final read-only review found no concrete P1/P2 regression in the shared controls or SDK migration. `git diff --check` also passed. Exports are JavaScript/Hermes bundles, not signed native builds.

Browser verification at `localhost:8081` used a synthetic local library:

- Onboarding, subject and note creation, two generated cards, card search, pause/resume, and persistence after reload.
- Five-question quiz completion (2/5, 20 XP); direct home review, answer accessibility, and a successful rating advancing the queue.
- Invalid backup rejection, export text/download initiation, restoring the same exported library, and persistence after reload (two notes, seven cards, six completed study items, 22 XP).
- Dark phone layout at 390x844 and light desktop layout at 1280x900; animation preference off; corrected button alignment and selected navigation state. No browser errors in the final inspected error log.
- Local screenshots: `qa-screenshots/audit-home-mobile-dark.png` and `qa-screenshots/audit-home-desktop-light.png` (ignored, not store assets). Native sharing and downloaded-file contents were not verified through a physical device or OS file picker.

The full app candidate is frozen on `codex/google-play-release-candidate` in PR #1; GitHub CI run `34294815009` passed. The unrelated local IDE and `AGENTS.md` edits were excluded, and the tracked local-only Claude settings were removed from the release branch while the disk copy remains intact. The policy/support slice is on `TsuTsu03/kwagi-app` main as commit `2368991`, and GitHub Pages is live. No app-source merge, signed bundle, Console upload, or store submission has occurred.

See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for ordered follow-up slices and acceptance criteria.

## Sources and prior context

- [Expo SDK 56 reference](https://docs.expo.dev/versions/v56.0.0/) and [SQLite SDK 56 API](https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/), checked against installed source.
- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [SDK 57 release notes](https://expo.dev/changelog/sdk-57), used for the supported memory-regression fix.
- Dependency advisory roots: [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) and [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). The SDK upgrade also removed the prior high-severity `image-size` dependency findings.
- Prior vault context: `01-Projects/Kwagi/Progress/Recheck Kwagi Store Submission Readiness.md` and `01-Projects/Kwagi/decisions.md`. The July offline v1 scope matches current source; historical release claims remain historical.
- [July launch audit](LAUNCH_AUDIT_2026-07-17.md) is retained as historical evidence, not the current development plan.
