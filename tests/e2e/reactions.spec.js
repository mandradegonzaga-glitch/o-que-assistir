import { test, expect, enterAsGuest, modal, openApp, openLibraryTab } from './support/app.js';

const reactions = page => page.locator('#m-reactions');
const reaction = (page, label) => reactions(page).getByRole('button', { name: label });

const openFirst = async page => {
  await page.locator('#btn-top10').click();
  await page.locator('#results-area .result-item').first().click();
  await expect(modal(page)).toBeVisible();
};

test.describe('reações rápidas', () => {
  test('convidado: marcar como visto abre o "Como foi?", e a reação fica guardada', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 6, 12, 0));
    await enterAsGuest(page);
    await openFirst(page);
    await expect(reactions(page)).toBeHidden(); // ainda não assistido

    await page.locator('#btn-visto').click();
    // Fica aberto, com o botão em "JÁ VISTO" e o foco na primeira reação
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#btn-visto')).toBeDisabled();
    await expect(page.locator('#btn-visto')).toHaveText('JÁ VISTO');
    await expect(reactions(page)).toBeVisible();
    await expect(reaction(page, 'Amei')).toBeFocused();
    await expect(page.locator('#m-reactions-note')).toBeHidden(); // convidado não tem amigos

    await reaction(page, 'Chorei').click();
    await expect(reaction(page, 'Chorei')).toHaveAttribute('aria-pressed', 'true');
    await expect(reaction(page, 'Amei')).toHaveAttribute('aria-pressed', 'false');
    await reaction(page, 'Ri muito').click(); // troca
    await expect(reaction(page, 'Ri muito')).toHaveAttribute('aria-pressed', 'true');
    await expect(reaction(page, 'Chorei')).toHaveAttribute('aria-pressed', 'false');

    await page.keyboard.press('Escape');
    await openLibraryTab(page, 'vistos');
    const item = page.locator('#library-content .library-item__open').first();
    await expect(item).toHaveAttribute('aria-label', / · Ri muito$/);
    await expect(item.locator('.title-reaction')).toHaveText('😂');

    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await openLibraryTab(page, 'vistos');
    await page.locator('#library-content .library-item__open').first().click();
    await expect(reaction(page, 'Ri muito')).toHaveAttribute('aria-pressed', 'true');
    await reaction(page, 'Ri muito').click(); // tocar de novo tira
    await expect(reactions(page).locator('[aria-pressed="true"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#library-content .title-reaction')).toHaveCount(0);
  });

  test.describe('com conta', () => {
    test.use({ logged: true });

    const seedWatched = page => page.addInitScript(() => {
      if (sessionStorage.getItem('__db')) return;
      sessionStorage.setItem('__db', JSON.stringify({
        profiles: [{ id: 'u1', username: 'teste', display_name: 'Pessoa Teste', email: 't@t.dev', roulette_wins: 0 }],
        watch_history: [{ user_id: 'u1', tmdb_id: 1, title: 'Filme Um', poster_path: '/1.jpg', media_type: 'movie', release_year: '2020', genres: [18], watched_at: new Date(2026, 10, 1).toISOString() }],
        watchlist: [], user_preferences: [], user_badges: [], sorteio_history: [], blacklist: [], episode_progress: [],
      }));
    });

    test('a reação vai para o histórico da conta, e os amigos são avisados na tela', async ({ page }) => {
      await seedWatched(page);
      await openApp(page);
      await openLibraryTab(page, 'vistos');
      await page.locator('#library-content .library-item__open').first().click();
      await expect(page.locator('#m-reactions-note')).toHaveText('Seus amigos veem sua reação.');
      await reaction(page, 'Amei').click();
      await expect.poll(() => page.evaluate(() => window.__db.watch_history[0].reaction)).toBe('fire');
    });

    test('se o servidor não salvar, a reação volta e avisa', async ({ page }) => {
      await seedWatched(page);
      await page.addInitScript(() => { window.__TEST.failReaction = true; });
      await openApp(page);
      await openLibraryTab(page, 'vistos');
      await page.locator('#library-content .library-item__open').first().click();
      await reaction(page, 'Amei').click();
      await expect(page.locator('#toast')).toHaveText('Não foi possível salvar a reação. Tente de novo.');
      await expect(reaction(page, 'Amei')).toHaveAttribute('aria-pressed', 'false');
    });

    test('o perfil do amigo mostra as reações dele', async ({ page }) => {
      await page.addInitScript(() => {
        window.__seed = {
          friends: [{ friendship_id: 'f1', other_id: 'u2', username: 'bia', display_name: 'Bia', status: 'accepted', direction: 'sent' }],
          profiles: { u2: { username: 'bia', display_name: 'Bia', watchlist: [], badges: [], history: [
            { tmdb_id: 7, title: 'Com Reação', poster_path: '/7.jpg', media_type: 'movie', genres: [35], reaction: 'laugh' },
            { tmdb_id: 8, title: 'Sem Reação', poster_path: '/8.jpg', media_type: 'movie', genres: [35], reaction: null },
          ] } },
        };
      });
      await openApp(page);
      await page.locator('#btn-friends').click();
      await page.locator('[data-action="friendOpen"]').click();
      const cards = page.locator('#friend-history .friend-title');
      await expect(cards.first()).toHaveAttribute('aria-label', 'Com Reação · Ri muito');
      await expect(cards.first().locator('.title-reaction')).toHaveText('😂');
      await expect(cards.nth(1)).toHaveAttribute('aria-label', 'Sem Reação');
      await expect(cards.nth(1).locator('.title-reaction')).toHaveCount(0);
    });
  });
});
