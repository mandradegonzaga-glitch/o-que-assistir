// Séries: temporadas, episódios, "Já vi" e "Como foi?" — iguais para conta e convidado (T001-115)
import { test, expect, enterAsGuest, openApp, modal, openLibraryTab } from './support/app.js';

const openFirstSeries = async page => {
  await page.locator('#btn-tv').click();
  await page.locator('#btn-top10').click();
  await page.locator('#results-area .result-item').first().click();
  await expect(modal(page)).toBeVisible();
};

const seen = page => page.locator('#btn-visto');
const reactions = page => page.locator('#m-reactions');

test.describe('séries como convidado', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 6, 12, 0));
  });

  test('mostra temporadas, marca episódio, aparece em Em Andamento e continua ao recarregar', async ({ page }) => {
    await enterAsGuest(page);
    await openFirstSeries(page);
    await expect(page.locator('#episodes-section')).toBeVisible();
    await expect(page.locator('#episodes-season-select option')).toHaveText(['Temporada 1']);
    await expect(page.locator('.episode-checkbox')).toHaveCount(3);
    await expect(seen(page)).toBeEnabled();
    await expect(seen(page)).toHaveText('Já vi');

    await page.locator('.episode-checkbox').first().check();
    await expect(page.locator('.episodes-season-counter')).toContainText('1/3 assistidos');
    await expect(page.locator('#episodes-status-badge')).toHaveText('Assistindo');
    await expect(seen(page)).toBeEnabled(); // ainda dá para marcar a série inteira

    await page.keyboard.press('Escape');
    await openLibraryTab(page, 'andando');
    await expect(page.locator('.up-next-card')).toHaveCount(1);
    await expect(page.locator('.up-next-card__episode')).toContainText('Próximo: T01E02');

    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await openLibraryTab(page, 'andando');
    await expect(page.locator('.up-next-card')).toHaveCount(1);
    await page.locator('.up-next-card__action').click();
    await expect(page.locator('.episode-checkbox').first()).toBeChecked();
  });

  test('"Já vi" marca a série, abre o "Como foi?" e tira de Em Andamento', async ({ page }) => {
    await enterAsGuest(page);
    await openFirstSeries(page);
    await page.locator('.episode-checkbox').first().check();
    await expect(reactions(page)).toBeHidden();

    await seen(page).click();
    await expect(seen(page)).toBeDisabled();
    await expect(seen(page)).toHaveText('Já visto');
    await expect(reactions(page)).toBeVisible();
    // Marca todas as temporadas junto
    await expect(page.locator('.episodes-season-counter')).toContainText('3/3 assistidos');
    await expect(page.locator('.episode-checkbox:checked')).toHaveCount(3);
    await expect(page.locator('#episodes-status-badge')).toHaveText('Concluído');
    await expect(page.locator('.episode-item__label')).toHaveText(['Episódio 1', 'Episódio 2', 'Episódio 3']); // nomes continuam
    await reactions(page).getByRole('button', { name: 'Amei' }).click();
    await expect(reactions(page).getByRole('button', { name: 'Amei' })).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('Escape');
    await openLibraryTab(page, 'andando');
    await expect(page.locator('.up-next-card')).toHaveCount(0);
    await openLibraryTab(page, 'vistos');
    await expect(page.locator('#library-content .library-item__open').first()).toHaveAttribute('aria-label', / · Amei$/);
  });

  test('marcar a temporada inteira conclui a série sozinha', async ({ page }) => {
    await enterAsGuest(page);
    await openFirstSeries(page);
    await page.locator('[data-action="marcarTemporadaAtual"]').click();
    await expect(page.locator('.episodes-season-counter')).toContainText('3/3 assistidos');
    await expect(seen(page)).toHaveText('Já visto');
    await expect(reactions(page)).toBeVisible();

    await page.locator('[data-action="desmarcarTodosEpisodios"]').click();
    await expect(page.locator('.episodes-season-counter')).toContainText('0/3 assistidos');
    await expect(seen(page)).toHaveText('Já vi');
    await expect(reactions(page)).toBeHidden();
  });
});

test.describe('"Vi até aqui"', () => {
  test('convidado: marca o episódio e os anteriores, sem tocar nos seguintes', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 6, 12, 0));
    await enterAsGuest(page);
    await openFirstSeries(page);
    await expect(page.locator('[data-action="marcarTodosEpisodios"]')).toHaveCount(0); // "Já vi" faz isso

    const upTo2 = page.getByRole('button', { name: 'Vi até T01E02: marca este e todos os anteriores' });
    await upTo2.click();
    await expect(page.locator('.episodes-season-counter')).toContainText('2/3 assistidos');
    const checks = page.locator('.episode-checkbox');
    await expect(checks.nth(0)).toBeChecked();
    await expect(checks.nth(1)).toBeChecked();
    await expect(checks.nth(2)).not.toBeChecked();
    await expect(page.locator('#episodes-status-badge')).toHaveText('Assistindo');
    await expect(page.locator('#btn-visto')).toHaveText('Já vi');
    // A lista é redesenhada: o foco volta para o mesmo botão
    await expect(page.getByRole('button', { name: 'Vi até T01E02: marca este e todos os anteriores' })).toBeFocused();

    await page.keyboard.press('Escape');
    await openLibraryTab(page, 'andando');
    await expect(page.locator('.up-next-card__episode')).toContainText('Próximo: T01E03');
  });

  test.describe('com conta', () => {
    test.use({ logged: true });

    test('grava de uma vez e, no último episódio, conclui a série', async ({ page }) => {
      await openApp(page);
      await openFirstSeries(page);
      await page.getByRole('button', { name: 'Vi até T01E03: marca este e todos os anteriores' }).click();
      await expect(page.locator('.episodes-season-counter')).toContainText('3/3 assistidos');
      await expect(page.locator('#btn-visto')).toHaveText('Já visto');
      await expect(reactions(page)).toBeVisible();
      expect(await page.evaluate(() => window.__db.episode_progress.map(e => e.episode_number).sort())).toEqual([1, 2, 3]);
    });
  });

  test('com mouse, só aparece ao passar por cima', async ({ page }) => {
    await enterAsGuest(page);
    await openFirstSeries(page);
    const row = page.locator('.episode-item').nth(1);
    const btn = row.locator('.episode-item__upto');
    await page.mouse.move(0, 0);
    await expect(btn).toHaveCSS('opacity', '0');
    await row.hover();
    await expect(btn).toHaveCSS('opacity', '1');
  });
});

test.describe('séries com conta', () => {
  test.use({ logged: true });

  test('"Já vi" marca todas as temporadas e grava no histórico', async ({ page }) => {
    await openApp(page);
    await openFirstSeries(page);
    await expect(page.locator('.episode-checkbox')).toHaveCount(3);
    await expect(seen(page)).toBeEnabled();

    await seen(page).click();
    await expect(seen(page)).toHaveText('Já visto');
    await expect(reactions(page)).toBeVisible();
    await expect(page.locator('#m-reactions-note')).toBeVisible();
    await expect(page.locator('.episodes-season-counter')).toContainText('3/3 assistidos');
    expect(await page.evaluate(() => window.__db.watch_history.map(h => h.media_type))).toEqual(['tv']);
    // Um pedido só para os 3 episódios, sem repetir
    expect(await page.evaluate(() => window.__db.episode_progress.map(e => e.episode_number).sort())).toEqual([1, 2, 3]);
  });

  test('dorama: "Já vi" vai para Doramas e, aberto pela biblioteca, continua dorama', async ({ page }) => {
    await openApp(page);
    await page.locator('#btn-dorama').click();
    await page.locator('#btn-top10').click();
    await page.locator('#results-area .result-item').first().click();
    await expect(page.locator('.episode-checkbox')).toHaveCount(3);
    await seen(page).click();
    await expect(reactions(page)).toBeVisible();
    await page.keyboard.press('Escape');

    await openLibraryTab(page, 'vistos');
    await expect(page.locator('.library-group-title')).toHaveText('DORAMAS (1)');
    await page.locator('#library-content .library-item__open').first().click();
    await expect(page.locator('.episode-checkbox:checked')).toHaveCount(3);
    await expect(seen(page)).toHaveText('Já visto');
    await expect(reactions(page)).toBeVisible();
    expect(await page.evaluate(() => [...new Set(window.__db.episode_progress.map(e => e.media_type))])).toEqual(['dorama']);
  });
});
