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

  return shuffled(usable, random).slice(0, Math.min(Math.floor(count), usable.length)).map((card) => {
    const answer = card.back.trim();
    const normalizedAnswer = answer.toLocaleLowerCase();
    const seen = new Set<string>();
    const distractorPool: string[] = [];
    for (const item of usable) {
      const candidate = item.back.trim();
      const normalized = candidate.toLocaleLowerCase();
      if (item.id === card.id || normalized === normalizedAnswer || seen.has(normalized)) continue;
      seen.add(normalized);
      distractorPool.push(candidate);
    }
    const distractors = shuffled(distractorPool, random).slice(0, 3);
    const choices = shuffled([answer, ...distractors], random);
    return {
      flashcardId: card.id,
      subject: card.subject ?? 'General',
      question: card.front.trim(),
      choices,
      answer: choices.indexOf(answer),
    };
  });
}
