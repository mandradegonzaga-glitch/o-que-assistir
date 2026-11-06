import { test, expect, enterAsGuest, modal } from './support/app.js';

const panel = page => page.locator('#daily-panel');
const launcher = page => page.locator('#daily-launcher');
const rows = page => page.locator('#daily-picks-list .daily-pick');

test.describe('indicações do dia', () => {
  test.describe('vistas ontem', () => {
    test.use({ dailySeen: '2026-11-02' });

  test('abrem sozinhas na primeira entrada do dia e não de novo no mesmo dia', async ({ page, tmdbUrls }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 3, 12, 0));
    await page.goto('/');
    await expect(launcher(page)).toBeHidden(); // tela de login: nada de botão
    await page.locator('#login-form [data-action="loginAsGuest"]').click();

    // Antes de abrir: bolinha de novas
    await expect(launcher(page)).toHaveAttribute('aria-label', 'Indicações do dia (novas)');
    await expect(launcher(page).locator('.daily-launcher__dot')).toBeVisible();

    await expect(panel(page)).toBeVisible();
    await expect(rows(page).locator('.daily-pick__kind')).toHaveText(['Filme', 'Série', 'Dorama']);
    await expect(rows(page).first().locator('.daily-pick__meta')).toHaveText('2020 · ★ 8,5 · Drama');
    await expect(rows(page).first().locator('.daily-pick__overview')).toHaveText(/^Sinopse de /);
    await expect(rows(page).first()).toHaveAttribute('aria-label', /^Filme do dia: /);
    await expect(rows(page).nth(2)).toHaveAttribute('data-media', 'dorama');
    // Aberto sozinho, não rouba o foco
    expect(await page.evaluate(() => document.getElementById('daily-panel').contains(document.activeElement))).toBe(false);
    await expect(launcher(page).locator('.daily-launcher__dot')).toBeHidden();
    await expect(launcher(page)).toHaveAttribute('aria-expanded', 'true');

    // Pedidos ao TMDB: bem avaliados, ordenados por votos; o dorama é coreano
    const asked = tmdbUrls.filter(u => u.searchParams.get('sort_by') === 'vote_count.desc');
    expect(asked.map(u => u.pathname.replace(/^.*\/tmdb/, ''))).toEqual(['/discover/movie', '/discover/tv', '/discover/tv']);
    expect(asked[2].searchParams.get('with_origin_country')).toBe('KR');

    await page.locator('.daily-panel__close').click();
    await expect(panel(page)).toBeHidden();
    await expect(launcher(page)).toHaveAttribute('aria-expanded', 'false');

    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(launcher(page)).toHaveAttribute('aria-label', 'Indicações do dia');
    await page.waitForTimeout(1800);
    await expect(panel(page)).toBeHidden();
  });
  });

  test('o botão reabre; Esc fecha e devolve o foco; escolher abre o título', async ({ page }) => {
    await enterAsGuest(page);
    await expect(launcher(page)).toBeVisible();
    await expect(panel(page)).toBeHidden();

    await launcher(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(page.locator('.daily-panel__close')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(launcher(page)).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
    await rows(page).nth(1).click();
    await expect(panel(page)).toBeHidden();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#m-title')).not.toBeEmpty();
  });

  test('é o mesmo ao recarregar no mesmo dia e muda no dia seguinte', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 3, 12, 0));
    await enterAsGuest(page);
    await expect(rows(page)).toHaveCount(3);
    const today = await rows(page).evaluateAll(els => els.map(e => e.dataset.id));
    await page.reload();
    await expect(rows(page)).toHaveCount(3);
    expect(await rows(page).evaluateAll(els => els.map(e => e.dataset.id))).toEqual(today);

    await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0));
    await page.reload();
    await expect(rows(page)).toHaveCount(3);
    expect(await rows(page).evaluateAll(els => els.map(e => e.dataset.id))).not.toEqual(today);
  });

  test.describe('nunca vistas', () => {
    test.use({ dailySeen: null });

  test('quem chega por link de título não recebe o pop-up', async ({ page }) => {
    await page.goto('/?titulo=movie-1');
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(modal(page)).toBeVisible();
    await page.waitForTimeout(1800);
    await expect(panel(page)).toBeHidden();
    await expect(launcher(page).locator('.daily-launcher__dot')).toBeVisible();
  });

  test('sem TMDB, nem botão nem painel, e o resto da tela continua', async ({ page }) => {
    await page.route(/\/discover\/.*sort_by=vote_count\.desc/, route => route.fulfill({ status: 500, json: {} }));
    await enterAsGuest(page);
    await expect(page.locator('#btn-top10')).toBeVisible();
    await page.waitForTimeout(1800);
    await expect(launcher(page)).toBeHidden();
    await expect(panel(page)).toBeHidden();
  });
  });

  test('no celular, o painel cabe na tela e fica acima do botão', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterAsGuest(page);
    await launcher(page).click();
    await expect(panel(page)).toBeVisible();
    // Mede depois da animação de entrada (ela desce o painel 12px); no GitHub, mais lento, media no meio dela
    await panel(page).evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
    const box = await panel(page).boundingBox();
    const button = await launcher(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(button.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  // Canto inferior direito: botão das indicações, aviso, faixa "Instalar App", "voltar ao topo" e conquista
  // não podem se cobrir (achado do usuário em 2026-11-03: aviso e faixa por cima do botão)
  for (const [label, size] of [['computador', { width: 1280, height: 800 }], ['celular', { width: 390, height: 844 }]]) {
    test(`no ${label}, os elementos do canto não se cobrem`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.clock.install();
      await enterAsGuest(page);

      // Faixa de instalação de verdade: o navegador oferece instalar e o app espera 30 s
      await page.evaluate(() => {
        const event = new Event('beforeinstallprompt');
        event.prompt = () => {};
        event.userChoice = Promise.resolve({ outcome: 'dismissed' });
        window.dispatchEvent(event);
      });
      await page.clock.fastForward(30_000);
      await expect(page.locator('#pwa-install-banner')).toBeVisible();

      await page.evaluate(async () => {
        const { showToast: toast } = await import('/src/ui/feedback.js');
        toast('Desafio de hoje: Descubra um título lançado antes de 2000');
        // Com o relógio falso a animação CSS não anda: mede a posição final
        const box = document.getElementById('toast');
        box.style.animation = 'none';
        box.style.transition = 'none';
        window.scrollTo(0, 400);
        document.getElementById('scroll-top').classList.add('visible');
        const achievement = document.getElementById('achievement');
        achievement.hidden = false;
        achievement.classList.add('show');
        achievement.style.transition = 'none';
      });

      const overlaps = await page.evaluate(() => {
        const parts = { botao: '#daily-launcher', aviso: '#toast', faixa: '#pwa-install-banner', topo: '#scroll-top', conquista: '#achievement' };
        const boxes = Object.entries(parts).map(([name, sel]) => [name, document.querySelector(sel).getBoundingClientRect()]);
        const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const found = [];
        boxes.forEach(([a, ra], i) => boxes.slice(i + 1).forEach(([b, rb]) => { if (hit(ra, rb)) found.push(`${a} × ${b}`); }));
        return found;
      });
      expect(overlaps).toEqual([]);
      await expect(page.locator('.install-banner__dismiss')).toBeInViewport();

      // Dispensar a faixa devolve o botão para o canto
      const lifted = (await page.locator('#daily-launcher').boundingBox()).y;
      await page.locator('.install-banner__dismiss').click();
      await expect(page.locator('#pwa-install-banner')).toHaveCount(0);
      const settled = (await page.locator('#daily-launcher').boundingBox()).y;
      if (label === 'celular') expect(settled).toBeGreaterThan(lifted);
      else expect(settled).toBe(lifted);
    });
  }
});

test.describe('indicações do dia pelo DNA', () => {
  const seedHistory = (page, list) => page.addInitScript(items => {
    if (!sessionStorage.getItem('__seeded')) {
      sessionStorage.setItem('__seeded', '1');
      localStorage.setItem('guest_history', JSON.stringify(items));
    }
  }, list);
  // Ids que não estão na lista falsa do TMDB: nada é tirado por "já assistido"
  const horror = n => Array.from({ length: n }, (_, i) => ({ id: 100 + i, title: `T${i}`, poster: '/t.jpg', type: 'movie', year: '1990', genres: [27] }));
  const discover = urls => urls.filter(u => u.pathname.includes('/discover/'));

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 6, 12, 0));
  });

  test('só vê terror: o filme vem de terror; série e dorama, sem terror em série, ficam com as de todo mundo', async ({ page, tmdbUrls }) => {
    await seedHistory(page, horror(5));
    await enterAsGuest(page);
    await launcher(page).click();
    await expect(rows(page)).toHaveCount(3);

    await expect(rows(page).first().locator('.daily-pick__why')).toHaveText('Porque você curte Terror');
    // o gênero que trouxe a indicação vem primeiro
    await expect(rows(page).first().locator('.daily-pick__meta')).toHaveText(/ · Terror · /);
    await expect(rows(page).nth(1).locator('.daily-pick__why')).toHaveCount(0);
    await expect(rows(page).nth(2).locator('.daily-pick__why')).toHaveCount(0);
    await expect(page.locator('#daily-picks-note')).toHaveText('Escolhidos pelo seu gosto, novos à meia-noite');

    const personal = discover(tmdbUrls).filter(u => u.searchParams.has('with_genres'));
    expect(personal.map(u => [u.pathname.replace(/^.*\/tmdb/, ''), u.searchParams.get('with_genres')])).toEqual([['/discover/movie', '27']]);
    expect(personal[0].searchParams.get('vote_average.gte')).toBe('7.3');
  });

  test('com menos de 5 títulos, são as de todo mundo', async ({ page, tmdbUrls }) => {
    await seedHistory(page, horror(4));
    await enterAsGuest(page);
    await launcher(page).click();
    await expect(rows(page)).toHaveCount(3);
    await expect(page.locator('#daily-picks-list .daily-pick__why')).toHaveCount(0);
    await expect(page.locator('#daily-picks-note')).toHaveText('Um de cada, novos à meia-noite');
    expect(discover(tmdbUrls).some(u => u.searchParams.has('with_genres'))).toBe(false);
  });

  test('gênero sem resultado no TMDB: tenta a primeira página e volta para a de todo mundo', async ({ page, tmdbUrls }) => {
    await seedHistory(page, horror(5));
    await page.route('**/functions/v1/tmdb/discover/**', route => {
      const url = new URL(route.request().url());
      if (!url.searchParams.has('with_genres')) return route.fallback();
      tmdbUrls.push(url);
      return route.fulfill({ contentType: 'application/json', json: { results: [] } });
    });
    await enterAsGuest(page);
    await launcher(page).click();
    await expect(rows(page)).toHaveCount(3);
    await expect(page.locator('#daily-picks-list .daily-pick__why')).toHaveCount(0);
    const tried = discover(tmdbUrls).filter(u => u.searchParams.has('with_genres')).map(u => u.searchParams.get('page'));
    expect(tried.at(-1)).toBe('1');
  });
});

// Achado do usuário (2026-11-06): com o aviso ao lado do botão ✨, o deslocamento fixo de 400px
// deixava uma ponta do aviso escondido aparecendo na borda (tela de ~450px ou aviso comprido)
for (const width of [453, 600, 1280]) {
  test(`aviso escondido sai inteiro da tela (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await enterAsGuest(page);
    const toast = page.locator('#toast');
    await page.evaluate(() => {
      const t = document.getElementById('toast');
      t.innerText = 'Sequência de 12 dias! +5 XP · Desafio de hoje: Marque 2 títulos como assistidos';
      t.className = 'toast show success';
    });
    await expect(toast).toBeVisible();
    const right = () => toast.evaluate(el => el.getBoundingClientRect().right);
    await expect.poll(right).toBeLessThanOrEqual(width); // depois de entrar, inteiro na tela

    await page.evaluate(() => document.getElementById('toast').classList.remove('show'));
    await expect(toast).toBeHidden(); // invisível depois de sair
    expect(await toast.evaluate(el => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(width);
  });
}
