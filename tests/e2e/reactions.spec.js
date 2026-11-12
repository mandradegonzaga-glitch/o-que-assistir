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
    // Fica aberto, com o botão em "Já visto" e o foco na primeira reação
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#btn-visto')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#btn-visto')).toHaveText('Já visto');
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
    await expect(item).toHaveAttribute('aria-label', /, Ri muito$/);
    // selo ilustrado (etapa 5e) no lugar do emoji
    await expect(item.locator('img.title-reaction')).toHaveAttribute('src', /icons\/reactions\/laugh\.webp$/);
    // selo pequeno no canto, não do tamanho do pôster (a regra das imagens de pôster ganhava dele)
    expect((await item.locator('img.title-reaction').boundingBox()).width).toBeLessThan(40);

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

  // Achado do usuário (2026-11-12): o "Já visto" ficava travado, sem como desmarcar
  test('tocar de novo em "Já visto" tira de Já assistidos, com Desfazer', async ({ page }) => {
    await enterAsGuest(page);
    await openFirst(page);
    const seen = page.locator('#btn-visto');
    await seen.click();
    await expect(seen).toHaveText('Já visto');
    await expect(seen).toBeEnabled();
    await expect(seen).toHaveAttribute('aria-label', 'Tirar de Já assistidos');
    await expect(seen).toHaveCSS('color', 'rgb(34, 197, 94)'); // continua verde quando marcado

    await seen.click();
    await expect(seen).toHaveText('Já vi');
    await expect(seen).toHaveAttribute('aria-pressed', 'false');
    await expect(reactions(page)).toBeHidden();
    await expect(page.locator('#undo-toast')).toBeVisible();
    await page.locator('#undo-toast-btn').click();
    await expect(seen).toHaveText('Já visto');
    await expect(reactions(page)).toBeVisible();

    await seen.click();
    await expect(page.locator('#undo-toast')).toBeHidden({ timeout: 8000 }); // a remoção é gravada
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_history') || '[]'));
    expect(history).toHaveLength(0);
    await expect(seen).toHaveText('Já vi');
  });

  // Repasse da etapa 5e (2026-11-12): 6 selos ilustrados (Flow, Google Labs) e o ressalto ao escolher
  test('seis selos, com as duas negativas; escolher faz o selo surgir com ressalto', async ({ page }) => {
    await enterAsGuest(page);
    await openFirst(page);
    await page.locator('#btn-visto').click();
    const buttons = reactions(page).getByRole('button');
    await expect(buttons).toHaveText(['Amei', 'Chorei', 'Ri muito', 'Explodiu minha cabeça', 'Não curti', 'Dormi no meio']);
    await expect(buttons.locator('img')).toHaveCount(6);
    await expect(reactions(page).locator('img').first()).toHaveAttribute('alt', '');
    expect(await reactions(page).evaluate(el => el.textContent.match(/\p{Extended_Pictographic}/u))).toBeNull();

    await reaction(page, 'Dormi no meio').click();
    await expect(reaction(page, 'Dormi no meio')).toHaveAttribute('aria-pressed', 'true');
    const popping = await reaction(page, 'Dormi no meio').locator('img').evaluate(img => img.getAnimations().length);
    expect(popping).toBe(1);
  });

  test('com "reduzir movimento", o selo troca sem ressalto', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterAsGuest(page);
    await openFirst(page);
    await page.locator('#btn-visto').click();
    await reaction(page, 'Não curti').click();
    await expect(reaction(page, 'Não curti')).toHaveAttribute('aria-pressed', 'true');
    expect(await reaction(page, 'Não curti').locator('img').evaluate(img => img.getAnimations().length)).toBe(0);
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
      await expect(cards.first().locator('img.title-reaction')).toHaveAttribute('src', /icons\/reactions\/laugh\.webp$/);
      expect((await cards.first().locator('img.title-reaction').boundingBox()).width).toBeLessThan(40);
      await expect(cards.nth(1)).toHaveAttribute('aria-label', 'Sem Reação');
      await expect(cards.nth(1).locator('.title-reaction')).toHaveCount(0);
    });
  });
});
