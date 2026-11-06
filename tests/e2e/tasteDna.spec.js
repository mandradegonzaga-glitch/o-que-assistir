import { test, expect, enterAsGuest, modal, openApp } from './support/app.js';

const openProfile = async page => {
  await page.locator('.user-pill').click();
  await expect(page.locator('#modal-profile')).toBeVisible();
};

// Histórico do convidado já gravado no aparelho, antes de o app abrir
const seedHistory = (page, history) => page.addInitScript(list => {
  if (!sessionStorage.getItem('__seeded')) {
    sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('guest_history', JSON.stringify(list));
  }
}, history);

const at = (y, m, d) => new Date(y, m, d, 12).toISOString();

const HISTORY = [
  { id: 11, title: 'A', poster: '/a.jpg', type: 'movie', year: '1984', genres: [27], watchedAt: at(2026, 10, 2) },
  { id: 12, title: 'B', poster: '/b.jpg', type: 'movie', year: '1987', genres: [27], watchedAt: at(2026, 10, 3) },
  { id: 13, title: 'C', poster: '/c.jpg', type: 'tv', year: '2015', genres: [35, 10759], watchedAt: at(2026, 9, 10) },
  { id: 14, title: 'D', poster: '/d.jpg', type: 'dorama', year: '2021', genres: [18, 10749], watchedAt: at(2026, 7, 1) },
  { id: 15, title: 'E', poster: '/e.jpg', type: 'movie', year: '1989', genres: [{ id: 27, name: 'Terror' }], watchedAt: at(2026, 10, 4) },
];

test.describe('DNA do usuário', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 5, 12));
  });

  test('sem títulos vistos, convida a marcar', async ({ page }) => {
    await enterAsGuest(page);
    await openProfile(page);
    await expect(page.locator('#dna-summary')).toHaveText('Marque títulos como assistidos para descobrir o seu DNA.');
    await expect(page.locator('#dna-genres li')).toHaveCount(0);
    await expect(page.locator('#dna-months-wrap')).toBeHidden();
  });

  test('mostra gêneros, tipos, década e meses do histórico', async ({ page }) => {
    await seedHistory(page, HISTORY);
    await enterAsGuest(page);
    await openProfile(page);

    // Terror 3, Comédia/Ação/Aventura 1/3 cada, Drama/Romance 1/2 cada → 60, 10, 10, 7, 7, Outros 6
    await expect(page.locator('#dna-summary')).toHaveText('Você é 60% Terror, 10% Drama, 10% Romance, 7% Ação e 7% Aventura.');
    await expect(page.locator('#dna-note')).toBeHidden();
    const rows = page.locator('#dna-genres li');
    await expect(rows).toHaveCount(6);
    await expect(rows.first()).toContainText('Terror');
    await expect(rows.first()).toContainText('60%');
    // Outros (Comédia 1/3, 6%): sem barra, com o nome do que entrou nele
    await expect(rows.last()).toHaveText('Outros6%Comédia');
    await expect(rows.last().locator('.dna__genre-track')).toHaveCount(0);
    await expect(rows.first().locator('.dna__genre-fill')).toHaveAttribute('style', /width: 60%/);

    const facts = page.locator('#dna-facts');
    await expect(facts).toContainText('Filmes3');
    await expect(facts).toContainText('Séries1');
    await expect(facts).toContainText('Doramas1');
    await expect(facts).toContainText('Década favoritaAnos 80');

    const months = page.locator('#dna-months li');
    await expect(months).toHaveCount(6);
    await expect(months.last()).toHaveAttribute('aria-label', 'nov: 3 títulos');
    await expect(months.nth(4)).toHaveAttribute('aria-label', 'out: 1 título');
    await expect(months.nth(3)).toHaveAttribute('aria-label', 'set: nenhum título');
    await expect(months.nth(3).locator('.dna__month-fill')).toHaveClass(/is-empty/);
    await expect(page.locator('#stats-count')).toHaveText('5');
  });

  test('marcar como visto atualiza o DNA ao abrir o perfil de novo', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-top10').click();
    await page.locator('#results-area .result-item').first().click();
    await expect(modal(page)).toBeVisible();
    await page.locator('#btn-visto').click();
    await page.keyboard.press('Escape');
    await openProfile(page);
    await expect(page.locator('#dna-summary')).toHaveText('Você é 100% Drama.');
    await expect(page.locator('#dna-note')).toHaveText('Seu DNA ainda está se formando: ele usa 1 título até agora.');
    await expect(page.locator('#dna-months li').last()).toHaveAttribute('aria-label', 'nov: 1 título');
  });

  test('cabe na tela do celular sem rolagem lateral', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await seedHistory(page, HISTORY);
    await enterAsGuest(page);
    await openProfile(page);
    await expect(page.locator('#dna-genres li')).toHaveCount(6);
    const overflow = await page.locator('#dna').evaluate(el => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const facts = await page.locator('.dna__fact').evaluateAll(els => els.map(e => e.getBoundingClientRect().width));
    facts.forEach(w => expect(w).toBeGreaterThan(80));
    await expect(page.locator('#dna-life')).toContainText('Atriz Teste');
    expect(await page.locator('#dna').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe('horas assistidas e ator mais visto', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 5, 12));
  });

  const detailCalls = urls => urls.filter(u => /\/(movie|tv)\/\d+$/.test(u.pathname.replace(/^.*\/tmdb/, '')));

  test('soma filmes e séries inteiras, acha o ator e guarda para a próxima vez', async ({ page, tmdbUrls }) => {
    await seedHistory(page, HISTORY);
    await enterAsGuest(page);
    await openProfile(page);

    // 3 filmes × 120 min + série e dorama inteiros (3 episódios × 45 min cada) = 630 min ≈ 11 h
    const life = page.locator('#dna-life');
    await expect(life).toContainText('Horas assistidas11 haprox., pela duração no TMDB');
    await expect(life).toContainText('Ator mais vistoAtriz Testeem 5 títulos');
    await expect(life).not.toHaveAttribute('aria-busy');

    const calls = detailCalls(tmdbUrls);
    expect(calls).toHaveLength(5);
    calls.forEach(u => expect(u.searchParams.get('append_to_response')).toBe('credits'));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('title_facts')));
    expect(Object.keys(saved).sort()).toEqual(['movie:11', 'movie:12', 'movie:15', 'tv:13', 'tv:14']);
    expect(saved['tv:13']).toMatchObject({ episodeRuntime: 45, episodes: 3 });

    // Reabrir (e recarregar) não busca de novo
    await page.keyboard.press('Escape');
    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await openProfile(page);
    await expect(life).toContainText('11 h');
    expect(detailCalls(tmdbUrls)).toHaveLength(5);
  });

  test('sem TMDB, avisa e não inventa número', async ({ page }) => {
    await page.route('**/functions/v1/tmdb/movie/**', route => route.abort());
    await page.route('**/functions/v1/tmdb/tv/**', route => route.abort());
    await seedHistory(page, HISTORY);
    await enterAsGuest(page);
    await openProfile(page);
    const life = page.locator('#dna-life');
    await expect(life).toContainText('Horas assistidas—Sem conexão com o TMDB');
    await expect(life).toContainText('Ator mais visto—Sem conexão com o TMDB');
    // O resto do DNA continua
    await expect(page.locator('#dna-summary')).toContainText('60% Terror');
  });

  test('com um título só, ninguém repetiu ainda', async ({ page }) => {
    await seedHistory(page, HISTORY.slice(0, 1));
    await enterAsGuest(page);
    await openProfile(page);
    await expect(page.locator('#dna-life')).toContainText('Horas assistidas2 h');
    await expect(page.locator('#dna-life')).toContainText('Ator mais visto—Ninguém apareceu em 2 títulos ainda');
  });

  test.describe('com conta', () => {
    test.use({ logged: true });

    test('conta episódios de série em andamento e apaga os detalhes ao sair', async ({ page }) => {
      await page.addInitScript(() => {
        if (sessionStorage.getItem('__db')) return;
        const db = {
          profiles: [{ id: 'u1', username: 'teste', display_name: 'Pessoa Teste', email: 't@t.dev', roulette_wins: 0 }],
          watch_history: [{ user_id: 'u1', tmdb_id: 11, title: 'A', poster_path: '/a.jpg', media_type: 'movie', release_year: '1984', genres: [27], watched_at: new Date(2026, 10, 2).toISOString() }],
          watchlist: [], user_preferences: [], user_badges: [], sorteio_history: [], blacklist: [],
          episode_progress: [1, 2].map(n => ({ user_id: 'u1', series_id: 20, series_title: 'S', series_poster: '/s.jpg', media_type: 'tv', season_number: 1, episode_number: n })),
        };
        sessionStorage.setItem('__db', JSON.stringify(db));
      });
      await openApp(page);
      await openProfile(page);
      // 120 min do filme + 2 episódios × 45 min = 210 min ≈ 4 h
      await expect(page.locator('#dna-life')).toContainText('Horas assistidas4 h');
      expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('title_facts'))).sort())).toEqual(['movie:11', 'tv:20']);

      await page.keyboard.press('Escape');
      await page.locator('#logout-btn').click();
      await page.locator('#confirm-ok').click();
      await expect(page.locator('#login-overlay')).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('title_facts'))).toBeNull();
    });
  });
});
