import { test, expect, enterAsGuest, modal } from './support/app.js';

const row = page => page.locator('#daily-row');
const cards = page => page.locator('#daily-picks-list .home-card');

test.describe('indicações do dia', () => {
  test('ficam no alto do Início, um filme, uma série e um dorama', async ({ page, tmdbUrls }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 3, 12, 0));
    await page.goto('/');
    await page.locator('#login-form [data-action="loginAsGuest"]').click();

    await expect(row(page)).toBeVisible();
    await expect(cards(page).locator('.home-card__kind')).toHaveText(['Filme', 'Série', 'Dorama']);
    await expect(cards(page).first().locator('.home-card__meta')).toHaveText('2020 · ★ 8,5');
    await expect(cards(page).first().locator('.home-card__genre')).toHaveText('Drama');
    await expect(cards(page).first()).toHaveAttribute('aria-label', /^Filme do dia: /);
    await expect(cards(page).nth(2)).toHaveAttribute('data-media', 'dorama');
    // Nada abre por cima da tela: não há mais painel nem botão no canto
    await expect(page.locator('#daily-panel, #daily-launcher')).toHaveCount(0);

    // Pedidos ao TMDB: bem avaliados, ordenados por votos; o dorama é coreano
    const asked = tmdbUrls.filter(u => u.searchParams.get('sort_by') === 'vote_count.desc');
    expect(asked.map(u => u.pathname.replace(/^.*\/tmdb/, ''))).toEqual(['/discover/movie', '/discover/tv', '/discover/tv']);
    expect(asked[2].searchParams.get('with_origin_country')).toBe('KR');
  });

  test('escolher uma indicação abre o título', async ({ page }) => {
    await enterAsGuest(page);
    await cards(page).nth(1).click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#m-title')).not.toBeEmpty();
  });

  test('é o mesmo ao recarregar no mesmo dia e muda no dia seguinte', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 3, 12, 0));
    await enterAsGuest(page);
    await expect(cards(page)).toHaveCount(3);
    const today = await cards(page).evaluateAll(els => els.map(e => e.dataset.id));
    await page.reload();
    await expect(cards(page)).toHaveCount(3);
    expect(await cards(page).evaluateAll(els => els.map(e => e.dataset.id))).toEqual(today);

    await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0));
    await page.reload();
    await expect(cards(page)).toHaveCount(3);
    expect(await cards(page).evaluateAll(els => els.map(e => e.dataset.id))).not.toEqual(today);
  });

  test('sem TMDB, a fileira some e o resto da tela continua', async ({ page }) => {
    await page.route(/\/discover\/.*sort_by=vote_count\.desc/, route => route.fulfill({ status: 500, json: {} }));
    const failed = page.waitForResponse(/\/discover\/.*sort_by=vote_count\.desc/);
    await enterAsGuest(page);
    await failed;
    await expect(page.locator('#btn-top10')).toBeVisible();
    await expect(row(page)).toBeHidden();
  });

  test('no celular, as 3 cabem inteiras na largura e ficam depois do sorteio', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await enterAsGuest(page);
    await expect(cards(page)).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const box of await cards(page).evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()))) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(360);
    }
    // O sorteio vem antes: as indicações são um extra
    const draw = await page.locator('#btn-sortear').boundingBox();
    const row = await page.locator('#daily-row').boundingBox();
    expect(row.y).toBeGreaterThan(draw.y);
  });

  // Repasse da etapa 1 (2026-11-11): no cartão estreito a linha quebrava logo depois de um "·"
  // ("2012 · ★ 8,2 ·" e o gênero embaixo). Nenhum separador pode terminar uma linha.
  test('no celular, nenhum "·" fica sozinho no fim de uma linha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterAsGuest(page);
    await expect(cards(page)).toHaveCount(3);
    const orphans = await page.locator('#daily-picks-list .home-card__meta').evaluateAll(metas => metas.flatMap(meta => {
      const walker = document.createTreeWalker(meta, NodeFilter.SHOW_TEXT);
      const chars = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (let i = 0; i < node.length; i++) {
          if (!node.data[i].trim()) continue;
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          chars.push({ ch: node.data[i], top: range.getBoundingClientRect().top });
        }
      }
      return chars.filter((c, i) => c.ch === '·' && (i === chars.length - 1 || chars[i + 1].top > c.top + 2))
        .map(() => meta.textContent);
    }));
    expect(orphans).toEqual([]);
  });

  // Canto inferior direito: aviso, faixa "Instalar App", "voltar ao topo", conquista e (no celular) a barra
  // de baixo não podem se cobrir (achado do usuário em 2026-11-03: aviso e faixa um por cima do outro)
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
        const parts = { aviso: '#toast', faixa: '#pwa-install-banner', topo: '#scroll-top', conquista: '#achievement', barra: '.bottom-nav' };
        const boxes = Object.entries(parts).map(([name, sel]) => [name, document.querySelector(sel).getBoundingClientRect()]);
        const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const found = [];
        boxes.forEach(([a, ra], i) => boxes.slice(i + 1).forEach(([b, rb]) => { if (hit(ra, rb)) found.push(`${a} × ${b}`); }));
        return found;
      });
      expect(overlaps).toEqual([]);
      await expect(page.locator('.install-banner__dismiss')).toBeInViewport();
      if (label === 'celular') await expect(page.locator('.bottom-nav')).toBeInViewport({ ratio: 1 });
      else await expect(page.locator('.bottom-nav')).toBeHidden();

      // Dispensar a faixa devolve o "voltar ao topo" para baixo
      const lifted = (await page.locator('#scroll-top').boundingBox()).y;
      await page.locator('.install-banner__dismiss').click();
      await expect(page.locator('#pwa-install-banner')).toHaveCount(0);
      const settled = (await page.locator('#scroll-top').boundingBox()).y;
      expect(settled).toBeGreaterThan(lifted);
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

  test('sem histórico, os gêneros da primeira visita já guiam as indicações', async ({ page, tmdbUrls }) => {
    await page.addInitScript(() => localStorage.setItem('taste_seed', JSON.stringify([27])));
    await enterAsGuest(page);
    await expect(cards(page)).toHaveCount(3);
    await expect(cards(page).first().locator('.home-card__why')).toHaveText('Porque você curte Terror');
    const personal = discover(tmdbUrls).filter(u => u.searchParams.has('with_genres'));
    expect(personal.map(u => u.searchParams.get('with_genres'))).toEqual(['27']);
  });

  test('só vê terror: o filme vem de terror; série e dorama, sem terror em série, ficam com as de todo mundo', async ({ page, tmdbUrls }) => {
    await seedHistory(page, horror(5));
    await enterAsGuest(page);
    await expect(cards(page)).toHaveCount(3);

    await expect(cards(page).first().locator('.home-card__why')).toHaveText('Porque você curte Terror');
    // o gênero que trouxe a indicação vem primeiro
    await expect(cards(page).first().locator('.home-card__genre')).toHaveText('Terror');
    await expect(cards(page).nth(1).locator('.home-card__why')).toHaveCount(0);
    await expect(cards(page).nth(2).locator('.home-card__why')).toHaveCount(0);
    await expect(page.locator('#daily-picks-note')).toHaveText('Escolhidos pelo seu gosto, novos à meia-noite');

    const personal = discover(tmdbUrls).filter(u => u.searchParams.has('with_genres'));
    expect(personal.map(u => [u.pathname.replace(/^.*\/tmdb/, ''), u.searchParams.get('with_genres')])).toEqual([['/discover/movie', '27']]);
    expect(personal[0].searchParams.get('vote_average.gte')).toBe('7.3');
  });

  test('com menos de 5 títulos, são as de todo mundo', async ({ page, tmdbUrls }) => {
    await seedHistory(page, horror(4));
    await enterAsGuest(page);
    await expect(cards(page)).toHaveCount(3);
    await expect(page.locator('#daily-picks-list .home-card__why')).toHaveCount(0);
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
    await expect(cards(page)).toHaveCount(3);
    await expect(page.locator('#daily-picks-list .home-card__why')).toHaveCount(0);
    const tried = discover(tmdbUrls).filter(u => u.searchParams.has('with_genres')).map(u => u.searchParams.get('page'));
    expect(tried.at(-1)).toBe('1');
  });
});

// Achado do usuário (2026-11-06): com o aviso ao lado do botão do canto, o deslocamento fixo de 400px
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
