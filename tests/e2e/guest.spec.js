import { test, expect, enterAsGuest, modal, openLibrary, openLibraryTab, showTop10 } from './support/app.js';

const openFirst = async page => {
  await showTop10(page);
  await page.locator('#results-area .result-item').first().click();
  await expect(modal(page)).toBeVisible();
};

test.describe('convidado', () => {
  test('lista e vistos continuam depois de recarregar', async ({ page }) => {
    // Meio-dia: de madrugada, "Madrugador" apareceria antes de "Iniciante"
    await page.clock.setFixedTime(new Date(2026, 10, 3, 12, 0));
    await enterAsGuest(page);
    await openFirst(page);
    await page.locator('#btn-salvar').click();
    await expect(page.locator('#library-content .library-item')).toHaveCount(1);

    await openFirst(page);
    await page.locator('#btn-visto').click();
    await expect(page.locator('#achievement-name')).toHaveText('Iniciante');
    // "Já vi" deixa o título aberto (para o "Como foi?"); aberto, o endereço reabriria ele ao recarregar
    await page.keyboard.press('Escape');
    await expect(modal(page)).toBeHidden();

    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('#library-content .library-item')).toHaveCount(1);
    await openLibraryTab(page, 'vistos');
    await expect(page.locator('#library-content .library-item')).toHaveCount(1);
  });

  test('remover e desfazer funcionam', async ({ page }) => {
    await enterAsGuest(page);
    await openFirst(page);
    await page.locator('#btn-salvar').click();
    await expect(modal(page)).toBeHidden();
    await openLibrary(page);
    const items = page.locator('#library-content .library-item:visible');
    await expect(items).toHaveCount(1);
    await page.locator('#library-content .remove-btn').click({ force: true });
    await expect(items).toHaveCount(0);
    await page.locator('#undo-toast-btn').click();
    await expect(items).toHaveCount(1);
  });

  test('roleta continua depois de recarregar', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#tab-mode-roulette').click();
    await page.locator('#roulette-input').fill('Duna');
    await page.locator('#roulette-input').press('Enter');
    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('.pool-tag')).toContainText('Duna');
  });

  test('ganha sequência e XP, sem repetir no mesmo dia', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('.user-pill').click();
    await expect(page.locator('#streak-current')).toHaveText('1 dia');
    await expect(page.locator('#level-xp')).toContainText('5 XP');

    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await page.locator('.user-pill').click();
    await expect(page.locator('#level-xp')).toContainText('5 XP');
  });

  test('sequência continua de um dia para o outro', async ({ page }) => {
    await page.addInitScript(() => {
      const yesterday = new Date(Date.now() - 86_400_000);
      const pad = n => String(n).padStart(2, '0');
      const day = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
      if (!localStorage.getItem('guest_progress')) localStorage.setItem('guest_progress', JSON.stringify({ xp: 97, streak: 6, bestStreak: 6, lastVisit: day, log: [] }));
    });
    await enterAsGuest(page);
    await expect(page.locator('#achievement')).toBeVisible();
    await page.locator('.user-pill').click();
    await expect(page.locator('#streak-current')).toHaveText('7 dias');
    await expect(page.locator('#level-name')).toHaveText('Aprendiz');
    await expect(page.locator('.badge-item.unlocked h4', { hasText: 'Foguinho' })).toBeVisible();
    await expect(page.locator('#badges-progress-label')).toHaveText('1 de 26 conquistas');
  });

  test('conquista bloqueada mostra quanto falta', async ({ page }) => {
    await page.addInitScript(() => {
      const yesterday = new Date(Date.now() - 86_400_000);
      const pad = n => String(n).padStart(2, '0');
      const day = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
      if (!localStorage.getItem('guest_progress')) localStorage.setItem('guest_progress', JSON.stringify({ xp: 97, streak: 6, bestStreak: 6, lastVisit: day, log: [] }));
    });
    await enterAsGuest(page);
    await page.locator('.user-pill').click();
    const badge = name => page.locator('.badge-item').filter({ has: page.locator('h4', { hasText: name }) });

    // Sequência de 7 dias: Constante (30) mostra 7 de 30 e a barra em 23%
    await expect(badge('Constante').locator('.badge-count')).toHaveText('7 de 30');
    const width = await badge('Constante').locator('.badge-meter__fill').evaluate(el => el.style.width);
    expect(parseFloat(width)).toBeCloseTo(23.33, 1);
    await expect(badge('Constante').locator('.badge-meter')).toHaveAttribute('aria-hidden', 'true');
    await expect(badge('Cinéfilo').locator('.badge-count')).toHaveText('0 de 10');

    // Desbloqueada e "fez ou não fez" não mostram contagem
    await expect(badge('Foguinho').locator('.badge-count')).toHaveCount(0);
    await expect(badge('Iniciante').locator('.badge-count')).toHaveCount(0);
    await expect(badge('Madrugador').locator('.badge-meter')).toHaveCount(0);
  });
});

test.describe('de convidado para conta', () => {
  test.use({ logged: true });

  test('o que o convidado guardou é oferecido à conta', async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      localStorage.setItem('guest_watchlist', JSON.stringify([{ id: 2, title: 'Filme Dois', poster: '/2.jpg', type: 'movie' }]));
    });
    await page.goto('/');
    await expect(page.locator('#confirm-message')).toContainText('1 em Quero Assistir');
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#toast')).toContainText('Lista trazida');
    expect(await page.evaluate(() => ({ list: window.__db.watchlist.map(i => i.title), left: localStorage.getItem('guest_watchlist') }))).toEqual({ list: ['Filme Dois'], left: null });
  });

  const plantEpisodes = page => page.addInitScript(() => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('guest_watchlist', JSON.stringify([{ id: 2, title: 'Filme Dois', poster: '/2.jpg', type: 'movie' }]));
    localStorage.setItem('guest_episodes', JSON.stringify({
      77: { id: 77, title: 'Série Sete', poster: '/7.jpg', type: 'tv', keys: ['77-s1-e1', '77-s1-e2'] },
      88: { id: 88, title: 'Dorama Oito', poster: '/8.jpg', type: 'dorama', keys: ['88-s2-e3'] },
    }));
  });

  test('episódios marcados como convidado vão para a conta', async ({ page }) => {
    await plantEpisodes(page);
    await page.goto('/');
    await expect(page.locator('#confirm-message')).toContainText('1 em Quero Assistir e o progresso de 2 séries');
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#toast')).toContainText('Lista trazida');
    const result = await page.evaluate(() => ({
      episodes: window.__db.episode_progress.map(e => `${e.series_title}/${e.media_type}/T${e.season_number}E${e.episode_number}`).sort(),
      left: localStorage.getItem('guest_episodes'),
    }));
    expect(result).toEqual({ episodes: ['Dorama Oito/dorama/T2E3', 'Série Sete/tv/T1E1', 'Série Sete/tv/T1E2'], left: null });

    // Em Andamento da conta já mostra as duas
    await openLibraryTab(page, 'andando');
    await expect(page.locator('.up-next-card')).toHaveCount(2);
  });

  test('se o banco falhar, os episódios continuam no aparelho', async ({ page }) => {
    await plantEpisodes(page);
    await page.goto('/');
    await page.evaluate(() => { window.__TEST.failUpsert = true; });
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#toast')).toHaveText(/Nada foi perdido/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('guest_episodes'))[77].keys)).toEqual(['77-s1-e1', '77-s1-e2']);
  });

  test('plataformas e progresso ficam na conta', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#user-display')).toHaveText('Pessoa Teste');
    await page.locator('.user-pill').click();
    await page.locator('#my-providers label', { hasText: 'Netflix' }).locator('input').check();
    await expect.poll(() => page.evaluate(() => window.__db.user_metadata?.my_providers)).toEqual(['8']);
    await expect.poll(() => page.evaluate(() => window.__db.user_metadata?.progress?.streak)).toBe(1);

    // Outro aparelho: sem nada salvo localmente, vem da conta
    await page.evaluate(() => localStorage.removeItem('my_providers'));
    await page.reload();
    await expect(page.locator('#input-provider option[value="minhas"]')).toHaveCount(1);
  });
});
