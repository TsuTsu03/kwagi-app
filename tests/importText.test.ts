import test from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, zipSync } from 'fflate';
import {
  cleanExtractedText,
  detectImportKind,
  joinSections,
  limitNoteText,
  titleFromFileName,
} from '../lib/import/text.ts';
import {
  decodeTextFile,
  decodeXmlEntities,
  DocumentReadError,
  extractDocxText,
  extractPptxText,
} from '../lib/import/office.ts';

test('detects readers from extensions before generic MIME types', () => {
  assert.equal(detectImportKind('Lecture 3.PDF', 'application/octet-stream'), 'pdf');
  assert.equal(detectImportKind('notes.docx', null), 'docx');
  assert.equal(detectImportKind('deck.pptx'), 'pptx');
  assert.equal(detectImportKind('summary.md', 'text/x-unknown'), 'text');
  assert.equal(detectImportKind('IMG_0001.HEIC'), 'image');
  assert.equal(detectImportKind('scan', 'image/jpeg'), 'image');
  assert.equal(detectImportKind('download', 'application/pdf; charset=binary'), 'pdf');
  assert.equal(detectImportKind('old.doc', 'application/msword'), null);
  assert.equal(detectImportKind(undefined, undefined), null);
});

test('builds readable titles from file names', () => {
  assert.equal(titleFromFileName('Bio_101  week_3.pdf'), 'Bio 101 week 3');
  assert.equal(titleFromFileName(null), '');
  assert.equal(titleFromFileName(`${'a'.repeat(120)}.txt`).length, 80);
});

test('cleans OCR and PDF artifacts without losing note structure', () => {
  const raw = '﻿Photo-\r\nsynthesis   makes​ sugar\n\n\n\n12\nPage 3 of 10\n  Chlorophyll: green pigment  \n2024 census\nWell-\nKnown';
  assert.equal(
    cleanExtractedText(raw),
    'Photosynthesis makes sugar\n\nChlorophyll: green pigment\n2024 census\nWell-\nKnown',
  );
  assert.equal(cleanExtractedText('mito-\nchondria'), 'mitochondria');
  assert.equal(cleanExtractedText('a\u0007b\tc'), 'ab c');
});

test('joins sections and trims oversized imports at a line boundary', () => {
  assert.equal(joinSections([' one ', '', 'two']), 'one\n\ntwo');
  assert.deepEqual(limitNoteText('short', 10), { text: 'short', truncated: false });
  const long = `${'x'.repeat(90)}\n${'y'.repeat(30)}`;
  assert.deepEqual(limitNoteText(long, 100), { text: 'x'.repeat(90), truncated: true });
  assert.deepEqual(limitNoteText('z'.repeat(150), 100), { text: 'z'.repeat(100), truncated: true });
});

test('decodes XML entities safely', () => {
  assert.equal(decodeXmlEntities('A &amp; B &lt;3 &#x41;&#66; &unknown; &#0;'), 'A & B <3 AB &unknown; ');
});

function docx(body: string) {
  return zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'word/document.xml': strToU8(`<?xml version="1.0"?><w:document><w:body>${body}</w:body></w:document>`),
  });
}

test('extracts Word paragraphs, tabs, and line breaks', () => {
  const bytes = docx(
    '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Cell </w:t></w:r><w:r><w:t xml:space="preserve">biology</w:t></w:r></w:p>'
    + '<w:p/>'
    + '<w:p><w:r><w:t>Nucleus</w:t><w:tab/><w:t>holds DNA &amp; RNA</w:t><w:br/><w:t>Q: next</w:t></w:r></w:p>'
    + '<w:p><w:r><w:delText>removed</w:delText></w:r></w:p>',
  );
  assert.equal(extractDocxText(bytes), 'Cell biology\n\nNucleus\tholds DNA & RNA\nQ: next\n');
});

test('rejects files that are not Word documents', () => {
  assert.throws(() => extractDocxText(strToU8('not a zip')), DocumentReadError);
  assert.throws(() => extractDocxText(zipSync({ 'other.xml': strToU8('<x/>') })), /not a Word document/);
});

function slide(text: string) {
  return strToU8(`<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p><a:p><a:pPr/></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
}

test('extracts slides in presentation order', () => {
  const bytes = zipSync({
    'ppt/presentation.xml': strToU8('<p:presentation><p:sldIdLst><p:sldId id="257" r:id="rId3"/><p:sldId id="256" r:id="rId2"/></p:sldIdLst></p:presentation>'),
    'ppt/_rels/presentation.xml.rels': strToU8('<Relationships><Relationship Id="rId2" Type="slide" Target="slides/slide1.xml"/><Relationship Id="rId3" Type="slide" Target="/ppt/slides/slide2.xml"/></Relationships>'),
    'ppt/slides/slide1.xml': slide('Second'),
    'ppt/slides/slide2.xml': slide('First'),
    'ppt/slides/slide10.xml': slide('Hidden from order list'),
    'ppt/slides/slide3.xml': slide(''),
  });
  assert.equal(extractPptxText(bytes), 'Slide 1\nFirst\n\nSlide 2\nSecond\n\nSlide 4\nHidden from order list');
});

test('falls back to file numbering when presentation order is missing', () => {
  const bytes = zipSync({
    'ppt/slides/slide10.xml': slide('Ten'),
    'ppt/slides/slide2.xml': slide('Two'),
  });
  assert.equal(extractPptxText(bytes), 'Slide 1\nTwo\n\nSlide 2\nTen');
  assert.throws(() => extractPptxText(zipSync({ 'ppt/presentation.xml': strToU8('<p/>') })), /no slides/);
});

test('decodes UTF-8 text files', () => {
  assert.equal(decodeTextFile(strToU8('Ñiño — résumé')), 'Ñiño — résumé');
});
