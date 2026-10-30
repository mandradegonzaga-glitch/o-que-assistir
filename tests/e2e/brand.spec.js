import { readFileSync } from 'node:fs';
import { test, expect, enterAsGuest } from './support/app.js';

const SOURCES = ['index.html', 'src/app/onboarding.js', 'src/app/pwa.js', 'src/ui/icons.js'];

test('todo bilhete do app é o da marca, com o play', () => {
  for (const file of SOURCES) {
    const svgs = readFileSync(file, 'utf8').match(/<svg\b[\s\S]*?<\/svg>/g) || [];
    for (const svg of svgs.filter(s => s.includes('M2 8a2 2 0 0 1 2-2h16'))) {
      expect(svg, file).toContain('M8 9v6l5-3z');
    }
  }
});

test('bilhete tem a mesma cor no login e no cabeçalho', async ({ page }) => {
  await enterAsGuest(page);
  const colors = await page.evaluate(() => ['.login-logo svg', '.logo svg'].map(s => getComputedStyle(document.querySelector(s)).color));
  expect(colors[0]).toBe(colors[1]);
});
