// Abertura do app (volta à etapa 1 do repasse com o clleancode, 2026-11-11)
import { test, expect } from './support/app.js';

const splash = page => page.locator('#splash');

test.describe('abertura', () => {
  // O ajudante dos testes marca a abertura como vista; aqui ela precisa tocar
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem('splash_seen'));
  });

  test('a pilha aparece, os de cima são arremessados e a tela sobe; recarregar não repete', async ({ page }) => {
    await page.goto('/');
    await expect(splash(page)).toHaveClass(/is-playing/);
    await expect(splash(page).locator('.splash__card')).toHaveCount(4);
    await expect(splash(page)).toHaveText(/O que assistir\?/i);
    // o de cima sai do lugar antes do de baixo
    const top = splash(page).locator('.splash__card').nth(3);
    await expect.poll(() => top.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).f), { timeout: 2000 }).toBeLessThan(-100);
    await expect(splash(page)).toHaveCount(0, { timeout: 3000 }); // some sozinha
    await expect(page.locator('#login-form [data-action="loginAsGuest"]')).toBeVisible();

    await page.evaluate(() => sessionStorage.setItem('splash_seen', '1')); // a sessão já viu
    await page.reload();
    await expect(splash(page)).toHaveCount(0);
  });

  test('tocar pula', async ({ page }) => {
    await page.goto('/');
    await expect(splash(page)).toHaveClass(/is-playing/);
    await splash(page).click();
    await expect(splash(page)).toHaveCount(0, { timeout: 800 });
  });

  test('com "reduzir movimento", não aparece', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(splash(page)).toHaveCount(0);
  });

  test('com títulos guardados no aparelho, os cartões levam os pôsteres deles', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('guest_watchlist', JSON.stringify([
      { id: 1, title: 'Um', poster: '/um.jpg', type: 'movie' },
      { id: 2, title: 'Dois', poster: '/dois.jpg', type: 'movie' },
    ])));
    await page.goto('/');
    await expect(splash(page).locator('.splash__poster')).toHaveCount(2);
    await expect(splash(page).locator('.splash__poster').first()).toHaveAttribute('src', /w342\/dois\.jpg|w342\/um\.jpg/);
  });
});
