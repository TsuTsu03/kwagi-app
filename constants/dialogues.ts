/** Taglish speech-bubble lines per Kwagi mood. */
export type KwagiMood =
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'correct'
  | 'wrong'
  | 'sleepy';

export const DIALOGUES: Record<KwagiMood, string[]> = {
  happy: ['Tara, mag-aral tayo!', 'Anong subject ngayon?', 'Ready na ba tayo?'],
  excited: ['TAMA! Idol kita!', 'Ayos! Keep it up!', 'Sige pa, kaya mo yan!'],
  thinking: ['Hm, isipin natin...', 'Processing...', 'Kwago mode activated!'],
  correct: ['Perpekto! +10 XP!', 'Board passer vibes!', 'Tama ang sagot!'],
  wrong: ['Mali, pero okay lang!', "Let's review this one.", 'Isang try pa?'],
  sleepy: ['Hoy, nandito pa ba tayo?', 'Tulog na ba tayo?', 'Break muna?'],
};

/** Pick a random dialogue line for a mood. */
export function randomDialogue(mood: KwagiMood): string {
  const lines = DIALOGUES[mood];
  return lines[Math.floor(Math.random() * lines.length)];
}

export interface PeekQuip {
  text: string;
  /** Facial expression Kwagi wears while saying it. */
  mood: KwagiMood;
}

/**
 * Short Taglish quips for the always-present peeking Kwagi, each paired with
 * the face he makes while saying it — so his expression matches the message
 * (cheering = excited, wondering = thinking, "rest na" = sleepy, etc.).
 */
export const PEEK_QUIPS: PeekQuip[] = [
  { text: 'Uy, nandito lang ako!', mood: 'happy' },
  { text: 'Peek-a-boo!', mood: 'excited' },
  { text: 'Kaya mo yan, laban lang!', mood: 'excited' },
  { text: 'Galingan mo, idol!', mood: 'excited' },
  { text: 'Konting push pa!', mood: 'excited' },
  { text: 'Kumusta ang review?', mood: 'thinking' },
  { text: 'Hmm, aral tayo mamaya?', mood: 'thinking' },
  { text: 'Wag kang susuko ha!', mood: 'happy' },
  { text: 'Andito ako para sa’yo.', mood: 'happy' },
  { text: 'Proud ako sa’yo!', mood: 'happy' },
  { text: 'Tubig muna, tapos balik tayo.', mood: 'sleepy' },
  { text: 'Break muna kung pagod ka na.', mood: 'sleepy' },
];

/** Quips Kwagi uses when you poke him — always upbeat. */
export const POKE_QUIPS: PeekQuip[] = [
  { text: 'Hihi, na-poke mo ako!', mood: 'excited' },
  { text: 'Uy! Game na ba tayo?', mood: 'excited' },
  { text: 'Andito lang ako, laban!', mood: 'excited' },
  { text: 'Yiee, kinilig ako!', mood: 'happy' },
];

/** Pick a random peek quip (Taglish) with its matching mood. */
export function randomPeek(): PeekQuip {
  return PEEK_QUIPS[Math.floor(Math.random() * PEEK_QUIPS.length)];
}

/** Pick a random poke reaction (Taglish) with its matching mood. */
export function randomPoke(): PeekQuip {
  return POKE_QUIPS[Math.floor(Math.random() * POKE_QUIPS.length)];
}
