# Kwagi — Google Stitch design reference

Distilled from the "Kwagi Study Buddy Design System" Stitch project
(12 screens). These mockups are **web/Tailwind-CDN + Material Symbols + Plus
Jakarta Sans + raster AI mascot images** — they are an *idea source*, not a
literal target. The real app stays **NativeWind + Ionicons + hand-built
`KwagiOwl` SVG + no emoji + English UI / Taglish Kwagi voice** (see the
project memory). Raw HTML for all screens lives in the chat transcript that
produced this folder.

## Tokens used in the mockups (for cross-checking)
- Dark bg `#0A0E1A`, surface `#121A2E`, deep navy `#061329`.
- Amber primary `#F5B454` / on-amber `#452B00`; teal `#34D9C4`/`#58F3DD`;
  coral `#F2776B`; secondary indigo-blue `#b6c4ff`.
- Radii: cards 22–24px, bubbles 26px, pills full.
- Type: Plus Jakarta Sans, extrabold tight headings (display 40/-0.04em).

## Patterns worth adopting (and where they landed in code)
1. **Pushable button** — `border-bottom: 4px` darker "lip" that collapses on
   press (`active: translateY(4px); border-b-0`). → `components/ui/Button.tsx`.
2. **Quiz feedback FX** — correct: pulse ring + teal halo + sparkles + bold
   "Galing!"; wrong: shake + coral. → `app/(tabs)/quiz.tsx`,
   `components/ui/QuizChoice` styling, mascot halo.
3. **Tablet nav rail + split quiz** — left vertical rail instead of bottom
   tab bar ≥768px; quiz becomes question-left / Kwagi-right. → `TabBar.tsx`
   (rail mode) + `quiz.tsx` split layout.
4. **Level path timeline** — vertical connected nodes (locked / current /
   done) instead of a flat list. → `app/(tabs)/progress.tsx`.
5. Already in the app: accuracy ring + count-up, daily-goal shimmer,
   staggered fade-ins, 6 moods w/ colored halos, peeking Kwagi.

## Mascot reference image URLs (Google CDN, may expire)
The mockups used AI-rendered owl art as placeholders. Kept only as visual
reference for refining the SVG — NOT shipped:
- Coach/correct owl: `lh3.googleusercontent.com/aida-public/AB6AXuAHmOvGl…`
- Waving / tablet owl: `lh3.googleusercontent.com/aida/AP1WRLvDjhG8qCA…`

## Conflicts intentionally NOT adopted
- Material Symbols icons → keep Ionicons.
- 🔥 emoji in stat chips → keep Ionicons `flame`.
- Raster mascot images → keep `KwagiOwl` SVG.
- Forcing claymorphic-light everywhere → keep dual dark/light themes.
