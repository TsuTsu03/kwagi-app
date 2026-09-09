const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8081';
const OUT = path.join(__dirname, '..', 'qa-screenshots');
const settings = {
  studentName: 'Jansen', course: 'BS Information Technology', yearLevel: '3rd Year',
  onboardingComplete: true, dailyGoal: 20, animationPreference: 'off',
  dialogueLanguage: 'taglish', themePref: 'dark', lastStudyAt: null,
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];

  const fresh = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  fresh.setDefaultTimeout(120_000);
  fresh.setDefaultNavigationTimeout(120_000);
  fresh.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  fresh.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await fresh.goto(BASE, { waitUntil: 'domcontentloaded' });
  await fresh.getByText('Meet Kwagi').waitFor();
  await fresh.getByPlaceholder('Course or program').fill('BS Psychology');
  await fresh.getByRole('button', { name: 'Start studying' }).click();
  await fresh.getByText('Your study desk', { exact: true }).waitFor();
  await fresh.screenshot({ path: path.join(OUT, 'onboarding-complete-mobile.png') });
  await fresh.close();

  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  page.setDefaultTimeout(120_000);
  page.setDefaultNavigationTimeout(120_000);
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => localStorage.setItem('kwagi.settings.v1', JSON.stringify(value)), settings);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Daily goal').waitFor();
  await page.screenshot({ path: path.join(OUT, 'home-mobile.png') });

  for (const [route, heading, file] of [
    ['/notes', 'Subjects', 'notes-mobile.png'],
    ['/cards', 'Cards', 'cards-mobile.png'],
    ['/quiz', 'Study', 'study-mobile.png'],
    ['/progress', 'Progress', 'progress-mobile.png'],
    ['/settings', 'Settings', 'settings-mobile.png'],
    ['/legal', 'Privacy and disclaimer', 'legal-mobile.png'],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.getByText(heading, { exact: true }).first().waitFor();
    await page.screenshot({ path: path.join(OUT, file) });
  }

  await page.goto(`${BASE}/notes`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New subject' }).click();
  await page.getByPlaceholder('Subject name').fill('Launch QA');
  await page.getByRole('button', { name: 'Add subject' }).click();
  await page.getByRole('button', { name: 'Open Launch QA' }).click();
  await page.getByRole('button', { name: 'New note' }).click();
  await page.getByPlaceholder('Note title').fill('Persistence check');
  await page.getByPlaceholder(/Write your notes/).fill('Atomic write :: Quiz and progress save together.\nReduce motion :: Device preference controls animation.');
  await page.getByRole('button', { name: 'Save + cards' }).click();
  await page.getByText('Persistence check').waitFor();

  await page.goto(`${BASE}/cards`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Atomic write', { exact: true }).waitFor();

  await page.goto(`${BASE}/quiz`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Start \d+-question quiz/ }).click();
  await page.getByLabel(/^Choice A:/).waitFor();
  await page.getByLabel(/^Choice A:/).click();
  await page.getByText('Correct answer').waitFor();
  await page.screenshot({ path: path.join(OUT, 'quiz-answer-mobile.png') });
  while (await page.getByRole('button', { name: 'Next question' }).count()) {
    await page.getByRole('button', { name: 'Next question' }).click();
    await page.getByLabel(/^Choice A:/).click();
  }
  await page.getByRole('button', { name: 'See results' }).click();
  await page.getByRole('button', { name: 'Done' }).waitFor();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.goto(`${BASE}/notes`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open Launch QA' }).click();
  await page.getByText('Persistence check').waitFor();

  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Settings', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Clear all data' }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  try {
    await page.getByText('Meet Kwagi').waitFor();
  } catch (error) {
    const stored = await page.evaluate(() => localStorage.getItem('kwagi.settings.v1'));
    throw new Error(`Clear-data flow did not return to onboarding. Stored settings: ${stored}. ${error.message}`);
  }
  await page.close();

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  desktop.setDefaultTimeout(120_000);
  desktop.setDefaultNavigationTimeout(120_000);
  desktop.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  await desktop.goto(BASE, { waitUntil: 'domcontentloaded' });
  await desktop.evaluate((value) => localStorage.setItem('kwagi.settings.v1', JSON.stringify(value)), settings);
  await desktop.reload({ waitUntil: 'domcontentloaded' });
  await desktop.getByText('Daily goal').waitFor();
  await desktop.screenshot({ path: path.join(OUT, 'home-desktop.png') });
  await browser.close();

  if (errors.length) throw new Error(`Runtime errors:\n${errors.join('\n')}`);
  console.log('QA passed: onboarding, note/card creation, quiz, persistence, clear data, tabs, legal, mobile, desktop');
}

main().catch((error) => { console.error(error); process.exit(1); });
