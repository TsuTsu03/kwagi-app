/** Taglish speech-bubble lines per Kwagi mood. */
export type KwagiMood =
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'correct'
  | 'wrong'
  | 'sleepy';

export const DIALOGUES: Record<KwagiMood, string[]> = {
  happy: ['Tara, mag-aral tayo! 📚', 'Anong subject ngayon?', 'Ready na ba tayo?'],
  excited: ['TAMA! Idol kita! 🎉', 'Ayos! Keep it up!', 'Sige pa, kaya mo yan!'],
  thinking: ['Hm, isipin natin...', 'Processing... 🤔', 'Kwago mode activated!'],
  correct: ['Perpekto! +10 XP! ⚡', 'Board passer vibes!', 'Correct! 🦉✨'],
  wrong: ['Mali, pero okay lang!', "Let's review this one.", 'Isang try pa? 💪'],
  sleepy: ['Hoy, nandito pa ba tayo?', 'Tulog na ba tayo? 😴', 'Break muna?'],
};

/** Pick a random dialogue line for a mood. */
export function randomDialogue(mood: KwagiMood): string {
  const lines = DIALOGUES[mood];
  return lines[Math.floor(Math.random() * lines.length)];
}
