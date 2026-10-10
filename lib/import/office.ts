import { strFromU8, unzipSync } from 'fflate';

/** Largest single XML part we will inflate; guards against zip bombs disguised as documents. */
const MAX_PART_BYTES = 20 * 1024 * 1024;

export class DocumentReadError extends Error {}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function unzipParts(bytes: Uint8Array, wanted: (name: string) => boolean): Record<string, string> {
  let tooLarge = false;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) => {
        if (!wanted(file.name)) return false;
        if (file.originalSize > MAX_PART_BYTES) { tooLarge = true; return false; }
        return true;
      },
    });
  } catch {
    throw new DocumentReadError('This file is damaged or is not a Word or PowerPoint document.');
  }
  if (tooLarge) throw new DocumentReadError('This document is too large to import.');
  return Object.fromEntries(Object.entries(files).map(([name, data]) => [name, strFromU8(data)]));
}

/**
 * Read the paragraphs of an Office Open XML part. Word and PowerPoint use the same shape:
 * paragraphs (`w:p` / `a:p`) contain text runs (`w:t` / `a:t`), tabs, and line breaks.
 */
function paragraphsFromXml(xml: string, ns: 'w' | 'a', budget = Infinity): string[] {
  const paragraphs: string[] = [];
  let used = 0;
  const paragraphPattern = new RegExp(`<${ns}:p[\\s>][\\s\\S]*?</${ns}:p>|<${ns}:p/>`, 'g');
  const piecePattern = new RegExp(`<${ns}:t(?:\\s[^>]*)?>([\\s\\S]*?)</${ns}:t>|<${ns}:(tab|br)\\b[^>]*/>`, 'g');
  for (const [paragraph] of xml.matchAll(paragraphPattern)) {
    let text = '';
    for (const piece of paragraph.matchAll(piecePattern)) {
      if (piece[2] === 'tab') text += '\t';
      else if (piece[2] === 'br') text += '\n';
      else text += decodeXmlEntities(piece[1]);
    }
    paragraphs.push(text);
    used += text.length + 1;
    // Stop once the note limit is covered; the rest would be cut anyway.
    if (used > budget) break;
  }
  return paragraphs;
}

export function extractDocxText(bytes: Uint8Array, budget = Infinity): string {
  const parts = unzipParts(bytes, (name) => name === 'word/document.xml');
  const xml = parts['word/document.xml'];
  if (xml === undefined) throw new DocumentReadError('This file is not a Word document.');
  return paragraphsFromXml(xml, 'w', budget).join('\n');
}

const PRESENTATION = 'ppt/presentation.xml';
const PRESENTATION_RELS = 'ppt/_rels/presentation.xml.rels';

/** Slide file names in presentation order, which can differ from their file numbering after reordering. */
function slideOrder(parts: Record<string, string>, slideNames: string[]): string[] {
  const byNumber = [...slideNames].sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  const presentation = parts[PRESENTATION];
  const rels = parts[PRESENTATION_RELS];
  if (!presentation || !rels) return byNumber;

  const targets = new Map<string, string>();
  for (const [relationship] of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = relationship.match(/\bId="([^"]+)"/)?.[1];
    const target = relationship.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) targets.set(id, `ppt/${target.replace(/^\/?(ppt\/)?/, '')}`);
  }
  const ordered: string[] = [];
  for (const [slideId] of presentation.matchAll(/<p:sldId\b[^>]*>/g)) {
    const name = targets.get(slideId.match(/\br:id="([^"]+)"/)?.[1] ?? '');
    if (name && slideNames.includes(name) && !ordered.includes(name)) ordered.push(name);
  }
  return ordered.length ? [...ordered, ...byNumber.filter((name) => !ordered.includes(name))] : byNumber;
}

export function extractPptxText(bytes: Uint8Array, budget = Infinity): string {
  const slidePattern = /^ppt\/slides\/slide\d+\.xml$/;
  const parts = unzipParts(bytes, (name) => slidePattern.test(name) || name === PRESENTATION || name === PRESENTATION_RELS);
  const slideNames = Object.keys(parts).filter((name) => slidePattern.test(name));
  if (!slideNames.length) throw new DocumentReadError('This presentation has no slides to import.');
  const slides: string[] = [];
  let used = 0;
  for (const [index, name] of slideOrder(parts, slideNames).entries()) {
    if (used > budget) break;
    const body = paragraphsFromXml(parts[name], 'a').filter((line) => line.trim()).join('\n');
    if (!body) continue;
    slides.push(`Slide ${index + 1}\n${body}`);
    used += body.length;
  }
  return slides.join('\n\n');
}

/** Decode a plain-text or Markdown file as UTF-8, reading at most about `budget` characters. */
export function decodeTextFile(bytes: Uint8Array, budget = Infinity): string {
  // UTF-8 uses at most 4 bytes per character; a character cut at the end becomes U+FFFD.
  return strFromU8(budget * 4 < bytes.byteLength ? bytes.subarray(0, budget * 4) : bytes);
}
