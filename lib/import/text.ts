/** Longest imported note we put in the editor; larger multiline inputs become sluggish on phones. */
export const MAX_IMPORT_CHARS = 100_000;

export type ImportKind = 'image' | 'pdf' | 'docx' | 'pptx' | 'text';

const EXTENSIONS: Record<string, ImportKind> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  heic: 'image',
  heif: 'image',
  webp: 'image',
  pdf: 'pdf',
  docx: 'docx',
  pptx: 'pptx',
  txt: 'text',
  md: 'text',
  markdown: 'text',
};

const MIME_TYPES: Record<string, ImportKind> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'text',
  'text/markdown': 'text',
};

/** Pick a reader from the file extension first, because pickers often report generic MIME types. */
export function detectImportKind(name: string | null | undefined, mimeType?: string | null): ImportKind | null {
  const extension = name?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension && EXTENSIONS[extension]) return EXTENSIONS[extension];
  const mime = mimeType?.toLowerCase().split(';')[0].trim();
  if (!mime) return null;
  if (MIME_TYPES[mime]) return MIME_TYPES[mime];
  if (mime.startsWith('image/')) return 'image';
  return null;
}

/** Use the file name as a note title, without its extension or separator noise. */
export function titleFromFileName(name: string | null | undefined): string {
  const base = (name ?? '').replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base.slice(0, 80);
}

// Lowercase Latin letters on both sides of a line-end hyphen mark a word split by wrapping.
const LINE_BREAK_HYPHEN = /([a-z\u00DF-\u00F6\u00F8-\u00FF])-\n([a-z\u00DF-\u00F6\u00F8-\u00FF])/g;

/**
 * Normalize text from OCR, PDFs, and documents: rejoin words split across lines,
 * drop bare page numbers, and keep at most one blank line between paragraphs.
 */
export function cleanExtractedText(raw: string): string {
  const text = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/[^\S\n]+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !/^(page\s*)?\d{1,3}(\s*(of|\/)\s*\d{1,3})?$/i.test(line));

  return lines
    .join('\n')
    .replace(LINE_BREAK_HYPHEN, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Join text from several pages, photos, or slides into one note. */
export function joinSections(sections: string[]): string {
  return sections.map((section) => section.trim()).filter(Boolean).join('\n\n');
}

/** Cut oversized imports at a paragraph or line boundary so the editor stays responsive. */
export function limitNoteText(text: string, max = MAX_IMPORT_CHARS): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  const slice = text.slice(0, max);
  const boundary = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'));
  return { text: (boundary > max * 0.8 ? slice.slice(0, boundary) : slice).trimEnd(), truncated: true };
}
