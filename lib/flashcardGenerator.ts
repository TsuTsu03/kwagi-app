export interface GeneratedCard {
  front: string;
  back: string;
}

function clean(value: string): string {
  return value.replace(/^[-*]\s*/, '').replace(/\s+/g, ' ').trim();
}

/** Convert explicit note patterns into cards without sending student data anywhere. */
export function generateFlashcards(content: string, limit = 20): GeneratedCard[] {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const cards: GeneratedCard[] = [];

  for (let index = 0; index < lines.length && cards.length < limit; index += 1) {
    const line = lines[index];
    let front = '';
    let back = '';

    const separator = line.match(/^(.+?)\s*::\s*(.+)$/);
    const term = line.match(/^([^:#]{2,80}):\s+(.{2,})$/);
    const question = line.match(/^Q(?:uestion)?\s*:\s*(.+)$/i);
    if (separator) {
      [, front, back] = separator;
    } else if (question && lines[index + 1]) {
      const answer = lines[index + 1].match(/^A(?:nswer)?\s*:\s*(.+)$/i);
      if (answer) {
        front = question[1];
        back = answer[1];
        index += 1;
      }
    } else if (term && !/^https?:/i.test(line)) {
      [, front, back] = term;
    }

    front = clean(front);
    back = clean(back);
    if (!front || !back) continue;
    if (cards.some((card) => card.front.toLowerCase() === front.toLowerCase())) continue;
    cards.push({ front, back });
  }

  return cards;
}
