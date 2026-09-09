// One-off script: captures marketing screenshots of Kwagi (web preview) into
// marketing-screenshots/. Requires `expo start --web` already running on :8081.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'marketing-screenshots');
const BASE = 'http://localhost:8081';

const SETTINGS = {
  studentName: '', course: 'College studies', yearLevel: '', onboardingComplete: true,
  dailyGoal: 50,
  animationPreference: 'off',
  dialogueLanguage: 'taglish',
  themePref: 'dark',
  lastStudyAt: null,
};

async function shot(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
  console.log('saved', name);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate((s) => localStorage.setItem('kwagi.settings.v1', JSON.stringify(s)), SETTINGS);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);

  await shot(page, '01-home.png');

  await page.getByRole('tab', { name: 'Study', exact: true }).click();
  await shot(page, '02-quiz-start.png');

  await page.getByRole('button', { name: /Start \d+-question quiz/ }).click();
  await shot(page, '03-quiz-question.png');

  // Answer choice B, whichever question was randomly picked.
  await page.click('[aria-label^="Choice B:"]');
  await shot(page, '04-quiz-feedback.png');

  await page.goto(`${BASE}/notes`, { waitUntil: 'load' });
  await shot(page, '05-notes.png');

  await page.goto(`${BASE}/cards`, { waitUntil: 'load' });
  await shot(page, '06-cards.png');

  await page.goto(`${BASE}/progress`, { waitUntil: 'load' });
  await shot(page, '07-progress.png');

  await browser.close();
})();
