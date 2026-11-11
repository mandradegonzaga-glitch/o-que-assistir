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
    await expect(page.locator('#episodes-seasons')).toBeHidden(); // uma temporada só: nada a escolher
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

// Repasse da etapa 2 (2026-11-11): nome comprido aparecia cortado ("…And the Bag's i…") e a lista
// tinha rolagem própria dentro da gaveta (duas rolagens uma dentro da outra no celular)
test.describe('lista de episódios no celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nome comprido aparece inteiro e a lista não rola sozinha', async ({ page }) => {
    const long = 'E o Saco Está no Rio: Parte Dois do Grande Final';
    await page.route(/\/tmdb\/tv\/\d+\/season\/1(\?|$)/, route => route.fulfill({
      contentType: 'application/json',
      json: { season_number: 1, episodes: Array.from({ length: 12 }, (_, i) => ({ season_number: 1, episode_number: i + 1, name: i === 2 ? long : `Episódio ${i + 1}` })) },
    }));
    await enterAsGuest(page);
    await openFirstSeries(page);
    const label = page.locator('.episode-item').nth(2).locator('.episode-item__label');
    await expect(label).toHaveText(long);
    expect(await label.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    const list = page.locator('#episodes-list');
    expect(await list.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  });
});

// Repasse da etapa 2 (2026-11-11): temporadas em pílulas, episódio com foto e data, um botão só para
// a temporada, o próximo episódio no alto da página e a criação da série junto do elenco
test.describe('episódios redesenhados', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/\/tmdb\/tv\/\d+(\?|$)/, route => route.fulfill({ contentType: 'application/json', json: {
      id: 1, name: 'Série Teste', overview: 'Sinopse', genres: [{ id: 18 }], number_of_seasons: 2, number_of_episodes: 6,
      created_by: [{ name: 'Vince Gilligan' }],
    } }));
    await page.route(/\/tmdb\/tv\/\d+\/season\/(\d+)(\?|$)/, route => {
      const season = Number(route.request().url().match(/season\/(\d+)/)[1]);
      return route.fulfill({ contentType: 'application/json', json: { season_number: season, episodes: [1, 2, 3].map(n => ({
        season_number: season, episode_number: n, name: `Ep ${season}.${n}`, overview: `Resumo do ${season}.${n}`, air_date: `2008-0${season}-1${n}`, still_path: n === 1 ? `/s${season}.jpg` : null,
      })) } });
    });
  });

  test('pílulas, foto e data, próximo episódio no alto e um botão que alterna', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 6, 12, 0));
    await enterAsGuest(page);
    await openFirstSeries(page);

    const pills = page.locator('#episodes-seasons .season-pill');
    await expect(pills).toHaveText(['Temporada 1', 'Temporada 2']);
    await expect(pills.first()).toHaveAttribute('aria-pressed', 'true');
    const first = page.locator('.episode-item').first();
    await expect(first.locator('img.episode-item__still')).toHaveAttribute('src', /w300\/s1\.jpg/);
    await expect(first.locator('.episode-item__date')).toHaveText('11/01/2008');
    await expect(page.locator('#m-series-progress')).toBeHidden(); // nada visto ainda

    await pills.nth(1).click();
    await expect(pills.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.episode-item__code').first()).toHaveText('T02E01');

    await pills.first().click();
    await page.locator('.episode-checkbox').first().check();
    const progress = page.locator('#m-series-progress');
    await expect(progress).toBeVisible();
    await expect(progress).toHaveText(/Próximo: T01E02 ·\s5 restantes/);

    await page.locator('[data-action="marcarTemporadaAtual"]').click();
    await expect(page.locator('.episodes-season-counter')).toContainText('3/3 assistidos');
    await expect(page.locator('.episodes-summary .episodes-bulk-btn').first()).toHaveText('Desmarcar temporada');
    await expect(progress).toHaveText(/Próximo: T02E01 ·\s3 restantes/);

    // tocar no progresso leva aos episódios
    await progress.click();
    await expect(page.locator('#episodes-section')).toBeInViewport();

    await expect(page.locator('#m-crew')).toHaveText(/Criação\s+Vince Gilligan/);
  });
});

// Pedidos do usuário depois da etapa 2 (2026-11-11, prints dele com Sobrenatural, 15 temporadas)
test.describe('episódios: ajustes pedidos', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/\/tmdb\/tv\/\d+(\?|$)/, route => route.fulfill({ contentType: 'application/json', json: {
      id: 1, name: 'Série Longa', overview: 'Sinopse', genres: [{ id: 18 }], number_of_seasons: 15, number_of_episodes: 45,
    } }));
    await page.route(/\/tmdb\/tv\/\d+\/season\/(\d+)(\?|$)/, route => {
      const season = Number(route.request().url().match(/season\/(\d+)/)[1]);
      return route.fulfill({ contentType: 'application/json', json: { season_number: season, episodes: [1, 2, 3].map(n => ({
        season_number: season, episode_number: n, name: `Ep ${season}.${n}`, overview: n === 1 ? 'Os irmãos encontram uma pista. '.repeat(8) : '',
      })) } });
    });
  });

  // Com o mouse a fileira de pílulas cortava na borda, sem barra nem como arrastar
  test('no computador, todas as temporadas ficam à vista, sem rolar de lado', async ({ page }) => {
    await enterAsGuest(page);
    await openFirstSeries(page);
    const pills = page.locator('#episodes-seasons .season-pill');
    await expect(pills).toHaveCount(15);
    const box = await page.locator('#episodes-seasons').boundingBox();
    for (const pill of await pills.all()) {
      const b = await pill.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(box.x);
      expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 1);
    }
    await pills.nth(14).click();
    await expect(page.locator('.episode-item__code').first()).toHaveText('T15E01');
  });

  test('recolher e mostrar os episódios', async ({ page }) => {
    await enterAsGuest(page);
    await openFirstSeries(page);
    const toggle = page.locator('#episodes-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toContainText('15 temporadas · 0/45 vistos');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#episodes-list')).toBeHidden();
    await expect(page.locator('#episodes-seasons')).toBeHidden();
    // recolhida, a seção vira uma faixa baixa (antes ficava alta e vazia; achado do usuário)
    expect((await page.locator('#episodes-section').boundingBox()).height).toBeLessThan(110);
    await toggle.click();
    await expect(page.locator('.episode-item')).toHaveCount(3);
  });

  test('sinopse do episódio: começa curta e abre ao tocar', async ({ page }) => {
    await enterAsGuest(page);
    await openFirstSeries(page);
    const overview = page.locator('.episode-item').first().locator('.episode-item__overview');
    await expect(overview).toContainText('Os irmãos encontram uma pista.');
    await expect(overview).toHaveAttribute('aria-expanded', 'false');
    const short = (await overview.boundingBox()).height;
    await overview.click();
    await expect(overview).toHaveAttribute('aria-expanded', 'true');
    expect((await overview.boundingBox()).height).toBeGreaterThan(short);
    // sem sinopse, nada no lugar
    await expect(page.locator('.episode-item').nth(1).locator('.episode-item__overview')).toHaveCount(0);
  });

  test('"X" no alto fecha o título', async ({ page }) => {
    await enterAsGuest(page);
    await openFirstSeries(page);
    const close = modal(page).getByRole('button', { name: 'Fechar', exact: true });
    await expect(close).toBeInViewport();
    await close.click();
    await expect(modal(page)).toBeHidden();
  });
});
