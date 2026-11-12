// Repasse do redesign, etapa 3 (2026-11-11): abertura da Biblioteca em cartões com a pilha de
// pôsteres (Binge) que abre em leque (clleancode), "Editar" para remover, filtro por tipo, nota
// embaixo do pôster, "Sair" no perfil e o boneco no avatar do convidado
import { test, expect, enterAsGuest, modal, openLibrary } from './support/app.js';

const seed = (page, { watchlist = [], history = [] }) => page.addInitScript(([w, h]) => {
  if (sessionStorage.getItem('__seeded')) return;
  sessionStorage.setItem('__seeded', '1');
  localStorage.setItem('guest_watchlist', JSON.stringify(w));
  localStorage.setItem('guest_history', JSON.stringify(h));
}, [watchlist, history]);

const item = (id, type, rating) => ({ id, title: `Título ${id}`, poster: `/${id}.jpg`, type, ...(rating && { rating }) });
const tile = (page, tab) => page.locator(`#library-overview [data-arg="${tab}"]`);

test.describe('abertura da Biblioteca', () => {
  test('um cartão por parte, com a contagem; tocar abre a lista e "Visão geral" volta', async ({ page }) => {
    await seed(page, { watchlist: [item(1, 'movie'), item(2, 'tv')], history: [item(3, 'movie')] });
    await enterAsGuest(page);
    await page.locator('#tab-mode-library').click();

    await expect(page.locator('#library-overview .library-tile__name')).toHaveText(['Quero Assistir', 'Em Andamento', 'Já Assistidos', 'Minhas Listas']);
    await expect(page.locator('[data-count="watchlist"]')).toHaveText('2 títulos');
    await expect(page.locator('[data-count="vistos"]')).toHaveText('1 título');
    await expect(page.locator('[data-count="andando"]')).toHaveText('Nenhum ainda');
    await expect(tile(page, 'watchlist').locator('img.library-tile__poster')).toHaveCount(2);
    await expect(page.locator('#library-browser')).toBeHidden();

    await tile(page, 'vistos').click();
    await expect(page.locator('#library-browser')).toBeVisible();
    await expect(page.locator('#library-overview')).toBeHidden();
    await expect(page.locator('#tab-vistos')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#library-content .library-item')).toHaveCount(1);

    await page.getByRole('button', { name: 'Visão geral' }).click();
    await expect(page.locator('#library-overview')).toBeVisible();
  });

  test('a pilha abre em leque antes de entrar; com "reduzir movimento", entra direto', async ({ page }) => {
    await seed(page, { watchlist: [item(1, 'movie'), item(2, 'movie'), item(4, 'movie')] });
    await enterAsGuest(page);
    await page.locator('#tab-mode-library').click();
    const watchlist = tile(page, 'watchlist');
    const before = await watchlist.locator('.library-tile__poster').nth(1).evaluate(el => getComputedStyle(el).transform);
    await watchlist.click();
    // no meio do leque o pôster de baixo já saiu do lugar e a lista ainda não apareceu
    await expect.poll(() => watchlist.locator('.library-tile__poster').nth(1).evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
    await expect(page.locator('#library-browser')).toBeVisible();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Visão geral' }).click();
    await tile(page, 'watchlist').click();
    await expect(page.locator('#library-browser')).toBeVisible();
  });

  // Achado ao investigar um teste instável (2026-11-12): durante o leque a visão geral continua na
  // tela, e um segundo toque em outro cartão abria a outra parte por cima da primeira
  test('dois toques seguidos: vale o primeiro cartão, o segundo é ignorado durante o leque', async ({ page }) => {
    await seed(page, { watchlist: [item(1, 'movie')], history: [item(3, 'movie')] });
    await enterAsGuest(page);
    await page.locator('#tab-mode-library').click();
    await expect(page.locator('[data-count="vistos"]')).toHaveText('1 título');
    // o segundo toque vem um instante depois, com o primeiro cartão ainda abrindo em leque
    await page.evaluate(() => new Promise(resolve => {
      document.querySelector('#library-overview [data-arg="vistos"]').click();
      setTimeout(() => { document.querySelector('#library-overview [data-arg="watchlist"]').click(); resolve(); }, 100);
    }));
    await expect(page.locator('#library-browser')).toBeVisible();
    await expect(page.locator('#tab-vistos')).toHaveAttribute('aria-selected', 'true');
    // nenhuma abertura atrasada troca a parte depois
    await page.waitForTimeout(800);
    await expect(page.locator('#tab-vistos')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('lista da Biblioteca', () => {
  test('os x de remover só aparecem em "Editar"', async ({ page }) => {
    await seed(page, { watchlist: [item(1, 'movie'), item(2, 'movie')] });
    await enterAsGuest(page);
    await openLibrary(page);
    await expect(page.locator('#library-content .library-item')).toHaveCount(2); // a lista já chegou
    const remove = page.locator('#library-content .remove-btn');
    expect(await remove.evaluateAll(els => els.map(el => getComputedStyle(el).display))).toEqual(['none', 'none']);
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(remove).toHaveCount(2);
    await expect(remove.first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Concluir' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('filtro por tipo, grupos em frase normal e a nota embaixo do pôster', async ({ page }) => {
    await seed(page, { watchlist: [item(1, 'movie', 8.4), item(2, 'tv'), item(3, 'movie')] });
    await enterAsGuest(page);
    await openLibrary(page);

    await expect(page.locator('.library-group-title')).toHaveText(['Filmes · 2', 'Séries · 1']);
    const pills = page.locator('.library-filter__pill');
    await expect(pills).toHaveText(['Todos 3', 'Filmes 2', 'Séries 1']);
    await pills.filter({ hasText: 'Séries' }).click();
    await expect(page.locator('#library-content .library-item')).toHaveCount(1);
    await expect(page.locator('.library-group-title')).toHaveText('Séries · 1');

    await pills.filter({ hasText: 'Todos' }).click();
    const rated = page.locator('#library-content .library-item__open[data-id="1"]');
    await expect(rated.locator('.library-item__rating')).toHaveText('★ 8,4');
    await expect(rated).toHaveAttribute('aria-label', 'Título 1, nota 8,4');
    await expect(page.locator('#library-content .library-item__open[data-id="3"] .library-item__rating')).toHaveCount(0);
  });

  test('salvar pelo título guarda a nota do TMDB', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-top10').click();
    await page.locator('#results-area .result-item').first().click();
    await expect(modal(page)).toBeVisible();
    await page.locator('#btn-salvar').click();
    await openLibrary(page);
    await expect(page.locator('#library-content .library-item__rating').first()).toHaveText('★ 8,5');
  });
});

test.describe('topo', () => {
  test('convidado: avatar com o boneco (não um "?"); "Sair" fica no perfil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterAsGuest(page);
    await expect(page.locator('#user-avatar svg')).toBeVisible();
    await expect(page.locator('#user-avatar')).not.toHaveText('?');
    await expect(page.locator('.header-actions #logout-btn')).toHaveCount(0);

    await page.locator('.user-pill').click();
    await expect(page.locator('#modal-profile #logout-btn')).toBeVisible();
    await page.locator('#logout-btn').click();
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#login-overlay')).toBeVisible();
    await expect(page.locator('#modal-profile')).toBeHidden(); // não fica aberto atrás da entrada
  });
});
