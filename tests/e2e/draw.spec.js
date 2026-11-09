// Etapa 5b do redesign: o sorteio vira um baralho de ingressos (src/ui/drawReveal.js)
import { test, expect, enterAsGuest, modal } from './support/app.js';

const stage = page => page.locator('#draw-stage');

test.beforeEach(async ({ page }) => {
  // Registra as vibrações (o navegador de teste não vibra)
  await page.addInitScript(() => {
    window.__vibrations = [];
    navigator.vibrate = pattern => { window.__vibrations.push(pattern); return true; };
  });
});

test('o baralho embaralha, vira no sorteado, vibra uma vez e dá lugar à página do título', async ({ page }) => {
  await enterAsGuest(page);
  await page.locator('#btn-sortear').click();
  await expect(stage(page)).toBeVisible();
  await expect(stage(page).locator('.draw-ticket')).toHaveCount(3);
  await expect(stage(page).locator('.draw-stage__caption')).toHaveText('Sorteando…');
  // Vira e mostra o nome do sorteado antes de abrir a página dele
  await expect(stage(page)).toHaveClass(/is-revealed/);
  const name = await stage(page).locator('.draw-stage__caption').textContent();
  expect(name).toMatch(/^Filme /);
  await expect(modal(page)).toBeVisible();
  await expect(page.locator('#m-title')).toHaveText(name);
  await expect(stage(page)).toBeHidden();
  expect(await page.evaluate(() => window.__vibrations)).toEqual([15]);
});

test('"Sortear outro" também passa pelo baralho, por cima da página do título', async ({ page }) => {
  await enterAsGuest(page);
  await page.locator('#btn-sortear').click();
  await expect(modal(page)).toBeVisible();
  await expect(stage(page)).toBeHidden();
  await page.locator('#btn-sortear-outro').click();
  await expect(stage(page)).toBeVisible();
  await expect(stage(page)).toBeHidden();
  await expect(modal(page)).toBeVisible();
  expect(await page.evaluate(() => window.__vibrations.length)).toBe(2);
});

test('sem nada para sortear, o baralho some e avisa', async ({ page }) => {
  await page.route('**/functions/v1/tmdb/**/discover/**', route => route.fulfill({ json: { results: [] } }));
  await enterAsGuest(page);
  await page.locator('#btn-sortear').click();
  await expect(page.locator('#toast')).toContainText('Nada encontrado');
  await expect(stage(page)).toBeHidden();
  await expect(modal(page)).toBeHidden();
  expect(await page.evaluate(() => window.__vibrations)).toEqual([]);
});

test('com "reduzir movimento", abre o sorteado direto, sem baralho', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterAsGuest(page);
  await page.locator('#btn-sortear').click();
  await expect(modal(page)).toBeVisible();
  expect(await stage(page).count()).toBe(0);
});
