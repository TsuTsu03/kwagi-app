/** XP thresholds → level names. Kwagi's gamified progression. */
export interface Level {
  name: string;
  minXp: number;
  badge: string;
}

export const LEVELS: Level[] = [
  { name: 'Freshie', minXp: 0, badge: '🥚' },
  { name: 'Studybuddy', minXp: 100, badge: '📖' },
  { name: 'Reviewee', minXp: 300, badge: '✏️' },
  { name: 'Crammer', minXp: 700, badge: '☕' },
  { name: 'Marunong', minXp: 1500, badge: '🧠' },
  { name: 'Board Ready', minXp: 3000, badge: '🔥' },
  { name: 'Board Passer', minXp: 6000, badge: '🎓' },
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
