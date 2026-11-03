import { test, expect, enterAsGuest, openApp, modal } from './support/app.js';
import { dailyChallengeFor } from '../../src/domain/challenges.js';

// Primeiro dia (a partir de 02/11/2026) cujo desafio é o pedido; meio-dia no horário local
function dayWith(id, guest) {
  for (let i = 0; i < 30; i++) {
    const date = new Date(2026, 10, 2 + i, 12, 0);
    const pad = n => String(n).padStart(2, '0');
    const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    if (dailyChallengeFor(day, { guest }).id === id) return date;
  }
  throw new Error(`nenhum dia com ${id}`);
}

const openTitle = async (page, index) => {
  await page.locator('#btn-top10').click();
  await page.locator('#results-area .result-item').nth(index).click();
  await expect(modal(page)).toBeVisible();
};

const openProfile = async page => {
  await page.locator('.user-pill').click();
  await expect(page.locator('#modal-profile')).toBeVisible();
};

test.describe('desafio do dia e meta da semana', () => {
  test('convidado vê o desafio ao entrar e ganha XP ao cumprir', async ({ page }) => {
    await page.clock.setFixedTime(dayWith('save2', true));
    await enterAsGuest(page);
    await expect(page.locator('#toast')).toContainText('Desafio de hoje: Salve 2 títulos em Quero Assistir');

    await openProfile(page);
    const daily = page.locator('#challenge-daily');
    await expect(daily.locator('.challenge__text')).toHaveText('Salve 2 títulos em Quero Assistir');
    await expect(daily.locator('.challenge__status')).toHaveText('0 de 2 · vale 25 XP');
    await expect(page.locator('#challenge-weekly .challenge__status')).toHaveText('0 de 3 · vale 50 XP');
    await expect(daily.locator('[role="progressbar"]')).toHaveAttribute('aria-valuemax', '2');
    await page.keyboard.press('Escape');

    await openTitle(page, 0);
    await page.locator('#btn-salvar').click();
    await openTitle(page, 1);
    await page.locator('#btn-salvar').click();
    await expect(page.locator('.achievement__kicker')).toHaveText('Desafio do dia concluído');
    await expect(page.locator('#achievement-desc')).toHaveText('+25 XP');

    // Tirar e salvar de novo não paga duas vezes (salvar fecha a janela do título)
    for (let i = 0; i < 2; i++) {
      await openTitle(page, 1);
      await page.locator('#btn-salvar').click();
    }
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_progress')));
    expect(saved.xp).toBe(5 + 25);
    expect(saved.challenges).toMatchObject({ dailyId: 'save2', daily: 2 });

    await page.keyboard.press('Escape');
    await openProfile(page);
    await expect(daily).toHaveClass(/done/);
    await expect(daily.locator('.challenge__status')).toHaveText('Concluído · +25 XP');
    await expect(page.locator('#xp-log')).toContainText('+25 XP · Desafio do dia');
  });

  test('o desafio de abrir títulos conta só o gênero pedido', async ({ page }) => {
    await page.clock.setFixedTime(dayWith('horror', true));
    await enterAsGuest(page);
    await openTitle(page, 0); // drama: não conta
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_progress')));
    expect(saved.challenges.daily).toBe(0);
  });

  test('assistir avança a meta da semana', async ({ page }) => {
    await page.clock.setFixedTime(dayWith('roulette', true));
    await enterAsGuest(page);
    await openTitle(page, 0);
    await page.locator('#btn-visto').click();
    await expect(page.locator('#achievement-name')).toHaveText('Iniciante');
    await page.keyboard.press('Escape');
    await openProfile(page);
    await expect(page.locator('#challenge-weekly .challenge__status')).toHaveText('1 de 3 · vale 50 XP');
    await expect(page.locator('#challenge-daily .challenge__status')).toHaveText('0 de 1 · vale 25 XP');
  });

  test.describe('com conta', () => {
    test.use({ logged: true });

    test('o andamento fica nos metadados da conta', async ({ page }) => {
      await page.clock.setFixedTime(dayWith('share', false));
      await openApp(page);
      await expect(page.locator('#toast')).toContainText('Desafio de hoje: Indique um título a um amigo');
      await openTitle(page, 0);
      await page.locator('#btn-visto').click();
      await expect.poll(() => page.evaluate(() => window.__db.user_metadata?.progress?.challenges)).toMatchObject({ dailyId: 'share', daily: 0, weekly: 1 });
    });
  });
});
