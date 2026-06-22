import type { KwagiMood } from '@/constants/dialogues';

/**
 * Kwagi the study friend. He's caring but not a pushover: he knows when
 * it's a good time to study, when you've earned a break, when you've been
 * grinding too long (rest!), and when you've been resting too long (balik!).
 * He champions BOTH focus and recovery — because real retention needs both.
 *
 * Pure + deterministic so it's trivial to reason about and test. Inputs are
 * today's accumulated study time, the timestamp of the last study activity,
 * and the current clock.
 */
export type CoachMode =
  | 'prime' // good hours, little studied yet — encourage a start
  | 'flow' // studied just now — protect the momentum
  | 'break' // solid chunk done — nudge a short rest
  | 'overstudy' // long continuous grind — insist on resting
  | 'resume' // rested a healthy amount — time to get back
  | 'overrest' // resting too long — firm, friendly nudge
  | 'winddown'; // late night — sleep beats cramming

export type CoachAccent = 'amber' | 'teal' | 'indigo' | 'coral' | 'green' | 'purple';

export interface CoachInput {
  now?: Date;
  /** Total seconds studied today (from daily_stats). */
  studySecondsToday: number;
  /** Epoch ms of last study activity, or null if none yet. */
  lastStudyAt: number | null;
  streak: number;
}

export interface CoachAdvice {
  mode: CoachMode;
  mood: KwagiMood;
  title: string;
  message: string;
  /** A study call-to-action when Kwagi wants you working. */
  cta?: { label: string };
  accent: CoachAccent;
}

const MIN = 60 * 1000;

export function getCoachAdvice({ now = new Date(), studySecondsToday, lastStudyAt, streak }: CoachInput): CoachAdvice {
  const hour = now.getHours();
  const studyMin = studySecondsToday / 60;
  const sinceMin = lastStudyAt == null ? Infinity : (now.getTime() - lastStudyAt) / MIN;

  const isLateNight = hour >= 22 || hour < 5;
  const studiedToday = studyMin > 0 || sinceMin < 24 * 60;

  // 1) Late night — sleep protects memory more than one more topic.
  if (isLateNight) {
    return {
      mode: 'winddown',
      mood: 'sleepy',
      title: 'Gabi na, kaibigan',
      message:
        studyMin > 0
          ? 'Solid ang ginawa mo ngayon. Ang puyat kalaban ng memory — matulog ka na, mas tatatak bukas ang natutunan mo.'
          : 'Pasado na ang oras ng deep focus. Kung gising ka pa, light review lang — wag mag-puyat, importante ang tulog.',
      accent: 'indigo',
    };
  }

  // 2) Over-studying — long grind + still going. Kwagi puts his foot down.
  if (studyMin >= 90 && sinceMin < 6) {
    return {
      mode: 'overstudy',
      mood: 'thinking',
      title: 'Pahinga muna — utos ni Kwagi',
      message:
        'Sobra na ng 90 minutes straight! Hindi tataas ang retention kung pagod na ang utak. Tigil muna — 10–15 min break, tubig, hangin. Babalik tayo mas matalino.',
      accent: 'teal',
    };
  }

  // 3) Earned a break — good chunk, still warm.
  if (studyMin >= 45 && sinceMin < 6) {
    return {
      mode: 'break',
      mood: 'happy',
      title: 'Magaling! Break time',
      message:
        '45+ minutes na — ayos ka! Quick 5-minute break: tingala, mag-inom. Ang tamang pahinga, parte ng pag-aaral. Tapos balik tayo fresh.',
      accent: 'green',
    };
  }

  // 4) In the zone — protect the flow.
  if (sinceMin < 6 && studyMin > 0) {
    return {
      mode: 'flow',
      mood: 'excited',
      title: 'Nasa zone ka!',
      message: 'Ganyan nga! Habang sariwa ang focus, tuloy-tuloy lang. Andito lang ako.',
      cta: { label: 'Tuloy mag-aral' },
      accent: 'amber',
    };
  }

  // 5) Resting too long after having studied — firm but kind.
  if (studiedToday && sinceMin >= 120 && sinceMin < 24 * 60) {
    return {
      mode: 'overrest',
      mood: 'thinking',
      title: 'Matagal na ang break ah',
      message:
        'Mahaba-haba na ang pahinga. Hindi ako pushover — tara, balikan natin, kahit 1 topic o 5 cards muna. Momentum is everything.',
      cta: { label: 'Balik tayo' },
      accent: 'coral',
    };
  }

  // 6) Healthy break done — ease back in.
  if (studiedToday && sinceMin >= 20 && sinceMin < 120) {
    return {
      mode: 'resume',
      mood: 'happy',
      title: 'Sakto ang pahinga',
      message: 'Nakapag-recharge ka na. Habang sariwa pa, tara ulit — kaunti lang muna, dahan-dahan.',
      cta: { label: 'Ituloy ang review' },
      accent: 'amber',
    };
  }

  // 7) Default — prime time to start.
  const evening = hour >= 18;
  return {
    mode: 'prime',
    mood: 'happy',
    title: streak >= 3 ? `${streak}-day streak — wag putulin!` : 'Magandang oras mag-aral',
    message: evening
      ? 'Perfect review window bago matulog. Light, focused session tayo — quality over quantity.'
      : 'Gising pa ang utak ngayon — magandang oras mag-focus. Tara, simulan natin nang mahinahon.',
    cta: { label: 'Simulan ang study' },
    accent: 'amber',
  };
}
