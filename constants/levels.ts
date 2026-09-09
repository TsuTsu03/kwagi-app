/** XP thresholds → level names. Kwagi's gamified progression. */
import type { Ionicons } from '@expo/vector-icons';

export type LevelIcon = keyof typeof Ionicons.glyphMap;

export interface Level {
  name: string;
  minXp: number;
  /** Ionicons glyph name — never an emoji. */
  icon: LevelIcon;
}

export const LEVELS: Level[] = [
  { name: 'Freshie', minXp: 0, icon: 'leaf' },
  { name: 'Studybuddy', minXp: 100, icon: 'book' },
  { name: 'Reviewee', minXp: 300, icon: 'pencil' },
  { name: 'Consistent', minXp: 700, icon: 'cafe' },
  { name: 'Marunong', minXp: 1500, icon: 'bulb' },
  { name: 'Dedicated', minXp: 3000, icon: 'flame' },
  { name: 'Lifelong Learner', minXp: 6000, icon: 'trophy' },
];

export interface LevelProgress {
  level: Level;
  levelIndex: number;
  nextLevel: Level | null;
  /** 0..1 progress toward next level (1 when maxed). */
  progress: number;
  xpIntoLevel: number;
  xpForNext: number;
}

export function getLevel(xp: number): LevelProgress {
  let levelIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) levelIndex = i;
  }
  const level = LEVELS[levelIndex];
  const nextLevel = LEVELS[levelIndex + 1] ?? null;

  if (!nextLevel) {
    return {
      level,
      levelIndex,
      nextLevel: null,
      progress: 1,
      xpIntoLevel: xp - level.minXp,
      xpForNext: 0,
    };
  }

  const span = nextLevel.minXp - level.minXp;
  const into = xp - level.minXp;
  return {
    level,
    levelIndex,
    nextLevel,
    progress: Math.max(0, Math.min(1, into / span)),
    xpIntoLevel: into,
    xpForNext: nextLevel.minXp - xp,
  };
}
