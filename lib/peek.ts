import type { KwagiMood } from '@/constants/dialogues';
import { randomPeek } from '@/constants/dialogues';
import { getStreak, getToday } from '@/lib/db/progress';
import { countDue } from '@/lib/db/flashcards';
import { useAppStore } from '@/lib/store';

/**
 * What Kwagi knows when he peeks in. Mirrors the signals the home coach uses,
 * so the floating buddy reacts to the same real study state.
 */
export interface PeekContext {
  now: Date;
  streak: number;
  due: number;
  cardsToday: number;
  goal: number;
  lastStudyAt: number | null;
  studySecondsToday: number;
}

export interface PeekAdvice {
  /** Taglish line (Kwagi's voice). */
  text: string;
  /** Face that matches the line. */
  mood: KwagiMood;
  /** If set, tapping Kwagi takes you here — his call to action. */
  route?: '/quiz' | '/notes' | '/progress';
}

/** Gather the live context Kwagi reacts to (3 quick reads + settings). */
export async function getPeekContext(): Promise<PeekContext> {
  const { settings } = useAppStore.getState();
  const [streak, due, today] = await Promise.all([getStreak(), countDue(), getToday()]);
  return {
    now: new Date(),
    streak,
    due,
    cardsToday: today.cards_studied + today.questions_answered,
    goal: settings.dailyGoal,
    lastStudyAt: settings.lastStudyAt,
    studySecondsToday: today.study_time_seconds,
  };
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const MIN = 60 * 1000;

/**
 * Decide what Kwagi says next based on context — highest-signal thing first,
 * like the home coach. Each branch carries a matching expression and an
 * optional tap target. Roughly 1 in 4 times he just says something playful
 * (via the generic quips) so he doesn't feel like a nagging robot.
 */
export function peekAdvice(ctx: PeekContext): PeekAdvice {
  const hour = ctx.now.getHours();
  const sinceMin = ctx.lastStudyAt == null ? Infinity : (ctx.now.getTime() - ctx.lastStudyAt) / MIN;
  const goalMet = ctx.goal > 0 && ctx.cardsToday >= ctx.goal;

  // Sprinkle in personality so he's not all business.
  if (Math.random() < 0.25) {
    return randomPeek();
  }

  // 1) Late night — rest beats cramming.
  if (hour >= 22 || hour < 5) {
    return {
      text: pick([
        'Gabi na! Tulog muna, mas tatatak bukas.',
        'Huwag mag-puyat ha, importante ang pahinga.',
      ]),
      mood: 'sleepy',
    };
  }

  // 2) Cards are waiting — the strongest nudge, with a tap to act.
  if (ctx.due > 0) {
    return {
      text: pick([
        `May ${ctx.due} ${ctx.due === 1 ? 'card' : 'cards'} ka na due, tara review tayo!`,
        `${ctx.due} due na cards. Pindutin mo ako, sabay tayo!`,
      ]),
      mood: 'thinking',
      route: '/quiz',
    };
  }

  // 3) Goal done today — celebrate.
  if (goalMet) {
    return {
      text: pick(['Tapos na goal mo ngayon, idol!', 'Goal complete! Sobrang proud ako sa’yo.']),
      mood: 'excited',
    };
  }

  // 4) In the zone — protect the momentum.
  if (sinceMin < 10) {
    return {
      text: pick(['Nasa zone ka! Tuloy-tuloy lang.', 'Ganyan nga, sustain mo lang yan!']),
      mood: 'excited',
    };
  }

  // 5) Streak going — don't break it.
  if (ctx.streak >= 3) {
    return {
      text: pick([
        `${ctx.streak}-day streak! Wag nating putulin ha.`,
        `${ctx.streak} araw na, laban pa para sa streak!`,
      ]),
      mood: 'happy',
      route: '/quiz',
    };
  }

  // 6) Goal started but not done.
  if (ctx.goal > 0 && ctx.cardsToday > 0) {
    const pct = Math.round((ctx.cardsToday / ctx.goal) * 100);
    return {
      text: pick([`${pct}% na sa goal, konti na lang!`, `Malapit na! ${pct}% ng goal mo.`]),
      mood: 'happy',
      route: '/quiz',
    };
  }

  // 7) Haven't started — gentle invite.
  return {
    text: pick([
      'Tara, simulan natin ang study?',
      'Pindutin mo ako, quiz tayo, dali lang!',
      'Andito lang ako. Aral tayo?',
    ]),
    mood: 'happy',
    route: '/quiz',
  };
}
