import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File as FsFile, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { discardPending, fileSize, supportsOriginals, type PendingOriginal } from '@/lib/attachmentFiles';
import { decodeTextFile, DocumentReadError, extractDocxText, extractPptxText } from './office';
import { detectImportKind, joinSections, prepareImportedText, RAW_IMPORT_CHARS, titleFromFileName, type ImportKind } from './text';

export interface ImportedNote {
  title: string;
  text: string;
  /** Number of photos or files the text came from. */
  sources: number;
  kind: ImportKind;
  /** The text was cut to keep the editor responsive. */
  truncated: boolean;
  /** Original files waiting to be kept with the note when it is saved. */
  originals: PendingOriginal[];
}

export interface ImportOptions {
  /** Keep the photo or file on this phone alongside the note text. */
  keepOriginals: boolean;
}

/** A problem the student can act on; the message is safe to show as-is. */
export class ImportError extends Error {}

/** Word, PowerPoint, and text files are read in JavaScript, so they stay small. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;
/** PDFs and photos are read natively and may be kept as originals. */
const MAX_NATIVE_FILE_BYTES = 100 * 1024 * 1024;
const MAX_PHOTOS = 20;
/**
 * Longest image edge for text recognition and for the kept copy. 2400 px reads lecture notes
 * well and keeps a kept photo near 1 MB instead of the 3 to 5 MB an iPhone original takes.
 */
const MAX_PHOTO_EDGE = 2400;

/** OCR and PDF reading are native-only and absent from Expo Go or builds made before these modules were added. */
export const importSupport = {
  photos: Platform.OS !== 'web' && requireOptionalNativeModule('ExpoTextExtractor') != null,
  pdf: Platform.OS !== 'web' && requireOptionalNativeModule('PdfExtractor') != null,
};

const WEB_FILE_TYPES = [
  '.txt', '.md', '.markdown', '.docx', '.pptx', 'text/plain', 'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

/** Remove our temporary copies; the student's original stays where it was. */
function discardCachedCopy(uri: string | undefined) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith(Paths.cache.uri)) return;
  try { new FsFile(uri).delete(); } catch { /* the OS clears its cache eventually */ }
}

function finish(kind: ImportKind, title: string, sections: string[], originals: PendingOriginal[] = []): ImportedNote {
  const { text, truncated } = prepareImportedText(joinSections(sections));
  // A scanned PDF or a photo without text is still worth keeping when the student asked for originals.
  if (!text && !originals.length) {
    throw new ImportError(kind === 'image'
      ? 'No readable text was found. Try a brighter, sharper photo taken straight on.'
      : kind === 'pdf'
        ? 'This PDF has no selectable text, which usually means it is a scan. Take photos of the pages instead.'
        : 'This file has no text to import.');
  }
  return { title, text, sources: sections.length, kind, truncated, originals };
}

/** Read a photo's text. With `keep`, the upright, resized JPEG is returned as a pending original. */
async function recognizeImage(uri: string, name: string, keep: boolean): Promise<{ text: string; original: PendingOriginal | null }> {
  // Rendering applies the photo's EXIF rotation, so text reaches the recognizer upright.
  const upright = await ImageManipulator.manipulate(uri).renderAsync();
  const longest = Math.max(upright.width, upright.height);
  const image = longest > MAX_PHOTO_EDGE
    ? await ImageManipulator.manipulate(upright)
      .resize(upright.width >= upright.height ? { width: MAX_PHOTO_EDGE } : { height: MAX_PHOTO_EDGE })
      .renderAsync()
    : upright;
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  let kept = false;
  try {
    const { extractTextFromImage } = await import('expo-text-extractor');
    const text = (await extractTextFromImage(saved.uri)).join('\n');
    kept = keep;
    const original = keep
      ? { uri: saved.uri, name: `${name.replace(/\.[a-z0-9]+$/i, '')}.jpg`, kind: 'image' as const, mimeType: 'image/jpeg', size: fileSize(saved.uri) }
      : null;
    return { text, original };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/download/i.test(message)) {
      throw new ImportError('The text reader is still being installed by Google Play services. Connect to the internet once, wait a minute, and try again.');
    }
    throw error;
  } finally {
    if (!kept) discardCachedCopy(saved.uri);
    upright.release();
    if (image !== upright) image.release();
  }
}

/** Read printed or handwritten notes from the camera or photo library. Resolves `null` when cancelled. */
export async function importFromPhotos(source: 'camera' | 'library', options: ImportOptions): Promise<ImportedNote | null> {
  if (!importSupport.photos) throw new ImportError('Reading photos needs the latest Kwagi app on Android or iPhone.');

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new ImportError('Camera access is off. Allow it in your phone settings, or choose photos instead.');
    }
    result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 });
  } else {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      orderedSelection: true,
    });
  }
  if (result.canceled || !result.assets.length) return null;

  const keep = options.keepOriginals && supportsOriginals;
  const pages: string[] = [];
  const originals: PendingOriginal[] = [];
  try {
    for (const [index, asset] of result.assets.slice(0, MAX_PHOTOS).entries()) {
      const page = await recognizeImage(asset.uri, asset.fileName ?? `Photo ${index + 1}`, keep);
      pages.push(page.text);
      if (page.original) originals.push(page.original);
    }
    const date = new Date().toLocaleDateString();
    return finish('image', pages.length > 1 ? `Photo notes (${pages.length} pages) ${date}` : `Photo notes ${date}`, pages, originals);
  } catch (error) {
    discardPending(originals);
    throw error;
  } finally {
    for (const asset of result.assets) discardCachedCopy(asset.uri);
  }
}

async function readBytes(asset: DocumentPicker.DocumentPickerAsset): Promise<Uint8Array> {
  const buffer = asset.file ? await asset.file.arrayBuffer() : await new FsFile(asset.uri).arrayBuffer();
  return new Uint8Array(buffer);
}

async function readPdf(uri: string): Promise<string> {
  if (!importSupport.pdf) throw new ImportError('Reading PDFs needs the latest Kwagi app on Android or iPhone.');
  const { extractText } = await import('@paul_sizon/expo-pdf-text-extract');
  // The native reader expects a plain path, not a percent-encoded file URI.
  return extractText(decodeURIComponent(uri.replace(/^file:\/\//, '')));
}

/** Import a PDF, Word, PowerPoint, text, or image file. Resolves `null` when cancelled. */
export async function importFromFile(options: ImportOptions): Promise<ImportedNote | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Android providers often report Markdown and Office files with generic MIME types, so filter after picking.
    type: Platform.OS === 'web' ? WEB_FILE_TYPES : '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];
  const keep = options.keepOriginals && supportsOriginals;
  // The picker's cached copy becomes the kept original instead of being deleted.
  const keepAsset = (kind: 'pdf' | 'document'): PendingOriginal[] => (keep
    ? [{ uri: asset.uri, name: asset.name, kind, mimeType: asset.mimeType ?? null, size: asset.size ?? fileSize(asset.uri) }]
    : []);
  let keptAsset = false;
  let originals: PendingOriginal[] = [];

  try {
    const kind = detectImportKind(asset.name, asset.mimeType);
    if (!kind) throw new ImportError('Kwagi can import PDF, Word (.docx), PowerPoint (.pptx), text, Markdown, and photo files.');
    const limit = kind === 'pdf' || kind === 'image' ? MAX_NATIVE_FILE_BYTES : MAX_FILE_BYTES;
    const tooLarge = `This file is larger than ${limit / 1024 / 1024} MB. Split it into smaller files and try again.`;
    if (asset.size != null && asset.size > limit) throw new ImportError(tooLarge);

    const title = titleFromFileName(asset.name);
    if (kind === 'image') {
      if (!importSupport.photos) throw new ImportError('Reading photos needs the latest Kwagi app on Android or iPhone.');
      const page = await recognizeImage(asset.uri, asset.name, keep);
      originals = page.original ? [page.original] : [];
      return finish(kind, title, [page.text], originals);
    }
    if (kind === 'pdf') {
      const text = await readPdf(asset.uri);
      originals = keepAsset('pdf');
      keptAsset = originals.length > 0;
      return finish(kind, title, [text], originals);
    }

    const bytes = await readBytes(asset);
    if (bytes.byteLength > MAX_FILE_BYTES) throw new ImportError(tooLarge);
    const text = kind === 'docx' ? extractDocxText(bytes, RAW_IMPORT_CHARS)
      : kind === 'pptx' ? extractPptxText(bytes, RAW_IMPORT_CHARS)
        : decodeTextFile(bytes, RAW_IMPORT_CHARS);
    // Plain text is fully captured by the note, so only Office files are worth keeping.
    originals = kind === 'text' ? [] : keepAsset('document');
    keptAsset = originals.length > 0;
    return finish(kind, title, [text], originals);
  } catch (error) {
    discardPending(originals);
    keptAsset = false;
    if (error instanceof DocumentReadError) throw new ImportError(error.message);
    throw error;
  } finally {
    if (!keptAsset) discardCachedCopy(asset.uri);
  }
}
