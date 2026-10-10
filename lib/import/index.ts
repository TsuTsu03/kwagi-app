import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File as FsFile, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decodeTextFile, DocumentReadError, extractDocxText, extractPptxText } from './office';
import { cleanExtractedText, detectImportKind, joinSections, limitNoteText, titleFromFileName, type ImportKind } from './text';

export interface ImportedNote {
  title: string;
  text: string;
  /** Number of photos or files the text came from. */
  sources: number;
  kind: ImportKind;
  /** The text was cut to keep the editor responsive. */
  truncated: boolean;
}

/** A problem the student can act on; the message is safe to show as-is. */
export class ImportError extends Error {}

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PHOTOS = 20;
/** Longest image edge sent to text recognition; larger photos cost memory without reading better. */
const MAX_OCR_EDGE = 3000;

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

function finish(kind: ImportKind, title: string, sections: string[]): ImportedNote {
  const cleaned = cleanExtractedText(joinSections(sections));
  if (!cleaned) {
    throw new ImportError(kind === 'image'
      ? 'No readable text was found. Try a brighter, sharper photo taken straight on.'
      : kind === 'pdf'
        ? 'This PDF has no selectable text, which usually means it is a scan. Take photos of the pages instead.'
        : 'This file has no text to import.');
  }
  const { text, truncated } = limitNoteText(cleaned);
  return { title, text, sources: sections.length, kind, truncated };
}

async function recognizeImage(uri: string): Promise<string> {
  // Rendering applies the photo's EXIF rotation, so text reaches the recognizer upright.
  const upright = await ImageManipulator.manipulate(uri).renderAsync();
  const longest = Math.max(upright.width, upright.height);
  const image = longest > MAX_OCR_EDGE
    ? await ImageManipulator.manipulate(upright)
      .resize(upright.width >= upright.height ? { width: MAX_OCR_EDGE } : { height: MAX_OCR_EDGE })
      .renderAsync()
    : upright;
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  try {
    const { extractTextFromImage } = await import('expo-text-extractor');
    return (await extractTextFromImage(saved.uri)).join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/download/i.test(message)) {
      throw new ImportError('The text reader is still being installed by Google Play services. Connect to the internet once, wait a minute, and try again.');
    }
    throw error;
  } finally {
    discardCachedCopy(saved.uri);
    upright.release();
    if (image !== upright) image.release();
  }
}

/** Read printed or handwritten notes from the camera or photo library. Resolves `null` when cancelled. */
export async function importFromPhotos(source: 'camera' | 'library'): Promise<ImportedNote | null> {
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

  const pages: string[] = [];
  try {
    for (const asset of result.assets.slice(0, MAX_PHOTOS)) pages.push(await recognizeImage(asset.uri));
  } finally {
    for (const asset of result.assets) discardCachedCopy(asset.uri);
  }
  const date = new Date().toLocaleDateString();
  return finish('image', pages.length > 1 ? `Photo notes (${pages.length} pages) ${date}` : `Photo notes ${date}`, pages);
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
export async function importFromFile(): Promise<ImportedNote | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Android providers often report Markdown and Office files with generic MIME types, so filter after picking.
    type: Platform.OS === 'web' ? WEB_FILE_TYPES : '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];

  try {
    const kind = detectImportKind(asset.name, asset.mimeType);
    if (!kind) throw new ImportError('Kwagi can import PDF, Word (.docx), PowerPoint (.pptx), text, Markdown, and photo files.');
    if (asset.size != null && asset.size > MAX_FILE_BYTES) throw new ImportError('This file is larger than 25 MB. Split it into smaller files and try again.');

    const title = titleFromFileName(asset.name);
    if (kind === 'image') {
      if (!importSupport.photos) throw new ImportError('Reading photos needs the latest Kwagi app on Android or iPhone.');
      return finish(kind, title, [await recognizeImage(asset.uri)]);
    }
    if (kind === 'pdf') return finish(kind, title, [await readPdf(asset.uri)]);

    const bytes = await readBytes(asset);
    if (bytes.byteLength > MAX_FILE_BYTES) throw new ImportError('This file is larger than 25 MB. Split it into smaller files and try again.');
    const text = kind === 'docx' ? extractDocxText(bytes) : kind === 'pptx' ? extractPptxText(bytes) : decodeTextFile(bytes);
    return finish(kind, title, [text]);
  } catch (error) {
    if (error instanceof DocumentReadError) throw new ImportError(error.message);
    throw error;
  } finally {
    discardCachedCopy(asset.uri);
  }
}
