import type { Settings } from '@/lib/storage/settings';

type Language = Settings['dialogueLanguage'];

/** Short reactions after each answer, in the student's chosen language. */
const LINES: Record<Language, { correct: string[]; wrong: string[]; streak: string[] }> = {
  taglish: {
    correct: ['Tama! Galing mo!', 'Ayos, sakto!', 'Yes! Pasok!', 'Nice one!', 'Galing! Tuloy lang.'],
    wrong: ['Muntik na!', 'Okay lang, matututunan natin ’to.', 'Next time, kuha mo na ’to.', 'Halos! Tandaan natin ’to.'],
    streak: ['sunod-sunod na tama!', 'in a row, on fire ka!', 'tuloy-tuloy lang!'],
  },
  filipino: {
    correct: ['Tama!', 'Magaling!', 'Ayos na ayos!', 'Husay mo!'],
    wrong: ['Halos tama na!', 'Ayos lang, matututunan natin ito.', 'Tandaan natin ito.'],
    streak: ['sunod-sunod na tama!', 'tuloy-tuloy lang!'],
  },
  english: {
    correct: ['Correct!', 'Nice work!', 'Spot on!', 'You got it!'],
    wrong: ['Almost!', 'Not quite. You’ll get it next time.', 'Good try. Let’s remember this one.'],
    streak: ['in a row!', 'in a row. Keep going!'],
  },
};

export function studyLine(language: Language, kind: 'correct' | 'wrong' | 'streak', seed = Math.random()): string {
  const options = LINES[language][kind];
  return options[Math.floor(seed * options.length) % options.length];
}

/** Labels that never change with language, kept together so screens stay consistent. */
export const ANSWER_LABEL: Record<Language, string> = {
  taglish: 'Ang tamang sagot:',
  filipino: 'Ang tamang sagot:',
  english: 'Correct answer:',
};

/** Kwagi's invitation on the Study tab, based on what is ready to study. */
export function inviteLine(language: Language, due: number, cards: number): string {
  if (language === 'english') {
    if (due) return `${due} ${due === 1 ? 'card is' : 'cards are'} ready for review. Shall we?`;
    return cards >= 2 ? 'Nothing due. A quick quiz keeps things fresh!' : 'Add a few cards from your notes and we can start.';
  }
  if (language === 'filipino') {
    if (due) return `May ${due} kard na handa nang i-review. Tara na!`;
    return cards >= 2 ? 'Wala pang due. Mabilis na quiz muna tayo!' : 'Magdagdag ng ilang kard mula sa notes mo para makapagsimula.';
  }
  if (due) return `May ${due} ${due === 1 ? 'card' : 'cards'} ka na due. Tara, review tayo!`;
  return cards >= 2 ? 'Wala pang due. Quick quiz muna para fresh!' : 'Gawa muna tayo ng cards mula sa notes mo.';
}
