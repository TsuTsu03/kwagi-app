import type { Flashcard } from '@/lib/db/flashcards';

export interface StudyQuestion {
  flashcardId: string;
  subject: string;
  question: string;
  choices: string[];
  answer: number;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function buildQuiz(cards: Flashcard[], count: number, random = Math.random): StudyQuestion[] {
  const usable = cards.filter((card) => !card.suspended && card.front.trim() && card.back.trim());
  if (usable.length < 2) return [];
  if (!Number.isFinite(count) || count < 1) return [];
  // A quiz needs a plausible alternative, not a one-choice free XP question.
  if (new Set(usable.map((card) => card.back.trim().toLocaleLowerCase())).size < 2) return [];

  // Distinct answers, computed once; the first wording of an answer is the one shown.
  const answers = new Map<string, string>();
  for (const card of usable) {
    const text = card.back.trim();
    const normalized = text.toLocaleLowerCase();
    if (!answers.has(normalized)) answers.set(normalized, text);
  }
  const pool = [...answers];

  return shuffled(usable, random).slice(0, Math.min(Math.floor(count), usable.length)).map((card) => {
    const answer = card.back.trim();
    const normalizedAnswer = answer.toLocaleLowerCase();
    const wanted = Math.min(3, pool.length - 1);
    const picked = new Map<string, string>();
    // Sample instead of shuffling the whole deck per question; large libraries have 40k+ cards.
    for (let attempt = 0; picked.size < wanted && attempt < wanted * 8; attempt += 1) {
      const [normalized, text] = pool[Math.floor(random() * pool.length)];
      if (normalized !== normalizedAnswer) picked.set(normalized, text);
    }
    for (const [normalized, text] of pool) {
      if (picked.size >= wanted) break;
      if (normalized !== normalizedAnswer) picked.set(normalized, text);
    }
    const choices = shuffled([answer, ...picked.values()], random);
    return {
      flashcardId: card.id,
      subject: card.subject ?? 'General',
      question: card.front.trim(),
      choices,
      answer: choices.indexOf(answer),
    };
  });
}
