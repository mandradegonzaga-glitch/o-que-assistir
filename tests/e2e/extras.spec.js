import { test, expect, enterAsGuest, lastDiscover } from './support/app.js';

test.describe('lançamentos e estreias', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 6, 12, 0));
  });

  test('filmes: o que chegou ao streaming no Brasil nos últimos 45 dias, com os filtros', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await page.locator('#input-genero').selectOption('27');
    await page.locator('#btn-lancamentos').click();
    await expect(page.locator('.results-caption')).toHaveText('Chegaram ao streaming e ao aluguel nos últimos 45 dias');
    await expect(page.locator('#results-area .result-item')).toHaveCount(5);
    const url = lastDiscover(tmdbUrls);
    expect(url.pathname).toMatch(/\/discover\/movie$/);
    expect(Object.fromEntries(['with_genres', 'release_date.gte', 'release_date.lte', 'with_release_type', 'region'].map(k => [k, url.searchParams.get(k)])))
      .toEqual({ with_genres: '27', 'release_date.gte': '2026-09-22', 'release_date.lte': '2026-11-06', with_release_type: '4', region: 'BR' });
  });

  test('doramas: os coreanos que estrearam nos últimos 60 dias', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await page.locator('#btn-dorama').click();
    await page.locator('#btn-lancamentos').click();
    await expect(page.locator('.results-caption')).toHaveText('Doramas que estrearam nos últimos 60 dias');
    const url = lastDiscover(tmdbUrls);
    expect(url.searchParams.get('with_origin_country')).toBe('KR');
    expect(url.searchParams.get('first_air_date.gte')).toBe('2026-09-07');
  });

  test('sem nada no período, diz isso em vez de uma tela vazia', async ({ page }) => {
    await page.route('**/functions/v1/tmdb/discover/**', route => {
      const url = new URL(route.request().url());
      if (!url.searchParams.has('release_date.gte')) return route.fallback();
      return route.fulfill({ contentType: 'application/json', json: { results: [] } });
    });
    await enterAsGuest(page);
    await page.locator('#btn-lancamentos').click();
    await expect(page.locator('#results-area .empty-state-title')).toHaveText('Nenhum lançamento com esses filtros nas últimas semanas');
    await expect(page.locator('.results-caption')).toHaveCount(0);
  });
});

const seedHistory = (page, list) => page.addInitScript(items => {
  if (!sessionStorage.getItem('__seeded')) {
    sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('guest_history', JSON.stringify(items));
  }
}, list);

test.describe('surpreenda-me', () => {
  test('sorteia de um gênero que a pessoa nunca viu, só bem avaliados, e diz qual', async ({ page, tmdbUrls }) => {
    // Viu de tudo, menos Faroeste (37)
    const seen = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752];
    await seedHistory(page, seen.map((g, i) => ({ id: 500 + i, title: `T${i}`, poster: '/t.jpg', type: 'movie', year: '2000', genres: [g] })));
    await enterAsGuest(page);
    await page.locator('#btn-surpresa').click();
    await expect(page.locator('#modal-resultado')).toBeVisible();
    await expect(page.locator('#toast')).toHaveText('Fora da sua zona de conforto: Faroeste');
    const url = lastDiscover(tmdbUrls);
    expect(url.searchParams.get('with_genres')).toBe('37');
    expect(url.searchParams.get('vote_average.gte')).toBe('7');
    expect(url.searchParams.get('vote_count.gte')).toBe('300');
  });

  test('sem nada bom no gênero, tenta o próximo menos visto', async ({ page, tmdbUrls }) => {
    await page.route('**/functions/v1/tmdb/discover/**', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('with_genres') !== '37') return route.fallback();
      tmdbUrls.push(url);
      return route.fulfill({ contentType: 'application/json', json: { results: [] } });
    });
    const seen = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53];
    // Guerra (10752) visto uma vez, Faroeste nunca: Faroeste vazio → Guerra
    await seedHistory(page, [...seen, ...seen, 10752].map((g, i) => ({ id: 500 + i, title: `T${i}`, poster: '/t.jpg', type: 'movie', year: '2000', genres: [g] })));
    await enterAsGuest(page);
    await page.locator('#btn-surpresa').click();
    await expect(page.locator('#toast')).toHaveText('Fora da sua zona de conforto: Guerra');
  });
});

test.describe('sessão às escuras', () => {
  const longOverview = name => `${name} é a história de alguém que precisa decidir, numa única noite, se conta a verdade para a família inteira.`;

  const blindItem = id => ({ id, title: `Filme ${id}`, overview: longOverview(`Filme ${id}`), poster_path: `/${id}.jpg`, vote_average: 8.456, vote_count: 900, release_date: '2021-05-01', genre_ids: [18], genres: [{ id: 18, name: 'Drama' }], runtime: 112 });
  test.beforeEach(async ({ page }) => {
    await page.route('**/functions/v1/tmdb/**', route => {
      const path = new URL(route.request().url()).pathname.replace(/^.*\/tmdb/, '');
      if (path.startsWith('/discover')) return route.fulfill({ contentType: 'application/json', json: { results: [1, 2, 3, 4].map(blindItem) } });
      const id = path.match(/^\/movie\/(\d+)$/)?.[1];
      if (id) return route.fulfill({ contentType: 'application/json', json: blindItem(Number(id)) });
      return route.fallback();
    });
  });

  test('mostra só sinopse, nota, duração, década e gêneros, com o título escondido; revelar abre o título', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-escuras').click();
    const modal = page.locator('#modal-blind');
    await expect(modal).toBeVisible();
    await expect(page.locator('#blind-title')).toHaveText('Um filme misterioso');
    await expect(page.locator('#blind-overview')).toHaveText(/^\[título\] é a história de alguém/);
    await expect(page.locator('#blind-rating')).toHaveText(/^★ \d,\d$/);
    await expect(page.locator('#blind-length')).toHaveText('1 h 52 min');
    await expect(page.locator('#blind-decade')).toHaveText('Anos 2020');
    await expect(page.locator('#blind-genres')).toHaveText('Drama');
    await expect(modal).not.toContainText(/Filme d/); // o nome do título; "Filmes" do resumo dos filtros pode
    await expect(modal.locator('img')).toHaveCount(0);

    await page.locator('#blind-reveal').click();
    await expect(modal).toBeHidden();
    await expect(page.locator('#modal-resultado')).toBeVisible();
    await expect(page.locator('#m-title')).toHaveText(/^Filme /);
  });

  test('"Outro às escuras" troca a sinopse sem fechar', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-escuras').click();
    await expect(page.locator('#modal-blind')).toBeVisible();
    await page.locator('#blind-another').click();
    await expect(page.locator('#modal-blind')).toBeVisible();
    await expect(page.locator('#blind-reveal')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-blind')).toBeHidden();
  });
});

test.describe('filtro por país', () => {
  test('vale no sorteio, no Top 10 e nos lançamentos, e fica no link', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await page.locator('#input-country').selectOption('JP');
    await expect(page).toHaveURL(/[?&]pais=JP/);
    await page.locator('#btn-top10').click();
    await expect(page.locator('#results-area .result-item').first()).toBeVisible();
    expect(lastDiscover(tmdbUrls).searchParams.get('with_origin_country')).toBe('JP');
    await page.locator('#btn-lancamentos').click();
    await expect(page.locator('.results-caption')).toBeVisible();
    expect(lastDiscover(tmdbUrls).searchParams.get('with_origin_country')).toBe('JP');
    await page.locator('#btn-sortear').click();
    await expect(page.locator('#modal-resultado')).toBeVisible();
    expect(lastDiscover(tmdbUrls).searchParams.get('with_origin_country')).toBe('JP');
  });

  test('abre do link e, em Dorama, fica desligado com o aviso', async ({ page }) => {
    await page.goto('/?pais=FR');
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('#input-country')).toHaveValue('FR');
    await expect(page.locator('#hint-country')).toBeHidden();
    await page.locator('#btn-dorama').click();
    await expect(page.locator('#input-country')).toBeDisabled();
    await expect(page.locator('#hint-country')).toBeVisible();
    await page.locator('#btn-movie').click();
    await expect(page.locator('#input-country')).toBeEnabled();
  });
});

test.describe('cine-batalha', () => {
  const item = id => ({ id, title: `Lutador ${id}`, overview: 'x', poster_path: `/${id}.jpg`, vote_average: 7.5, vote_count: 900, release_date: '2015-01-01', genre_ids: [18] });

  test('8 títulos, 7 escolhas, e o campeão abre', async ({ page }) => {
    await page.route('**/functions/v1/tmdb/discover/**', route => route.fulfill({ contentType: 'application/json', json: { results: Array.from({ length: 10 }, (_, i) => item(i + 1)) } }));
    await enterAsGuest(page);
    await page.locator('#btn-batalha').click();
    const modal = page.locator('#modal-battle');
    await expect(modal).toBeVisible();
    await expect(page.locator('#battle-stage')).toHaveText('Quartas de final · duelo 1 de 4');
    const fighters = page.locator('#battle-arena .battle__fighter');
    await expect(fighters).toHaveCount(2);
    await expect(fighters.first()).toHaveAttribute('aria-label', /^Escolher Lutador \d+$/);

    const picked = [];
    for (let i = 0; i < 7; i++) {
      const side = i % 2;
      picked.push((await fighters.nth(side).getAttribute('aria-label')).replace('Escolher ', ''));
      await fighters.nth(side).click();
      if (i === 3) await expect(page.locator('#battle-stage')).toHaveText('Semifinal · duelo 1 de 2');
      if (i === 5) await expect(page.locator('#battle-stage')).toHaveText('Final');
    }
    await expect(page.locator('#battle-stage')).toHaveText('Campeão');
    await expect(page.locator('#battle-champion-name')).toHaveText(picked.at(-1));
    await expect(page.locator('#battle-open')).toBeFocused();
    await expect(page.locator('#battle-track .battle__mark.is-done')).toHaveCount(7);

    await page.locator('#battle-open').click();
    await expect(modal).toBeHidden();
    await expect(page.locator('#modal-resultado')).toBeVisible();
  });

  test('com 5 títulos vira batalha de 4; com menos, explica', async ({ page }) => {
    let count = 5;
    await page.route('**/functions/v1/tmdb/discover/**', route => route.fulfill({ contentType: 'application/json', json: { results: Array.from({ length: count }, (_, i) => item(i + 1)) } }));
    await enterAsGuest(page);
    await page.locator('#btn-batalha').click();
    await expect(page.locator('#battle-stage')).toHaveText('Semifinal · duelo 1 de 2');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-battle')).toBeHidden();

    count = 3;
    await page.locator('#input-genero').selectOption('27'); // outro endereço: o cache do TMDB não responde
    await page.locator('#btn-batalha').click();
    await expect(page.locator('#toast')).toHaveText('Poucos títulos com esses filtros para uma batalha. Tente tirar algum filtro.');
    await expect(page.locator('#modal-battle')).toBeHidden();
  });
});

test.describe('efeito 3D nos pôsteres', () => {
  test('inclina seguindo o mouse e volta ao sair', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-top10').click();
    const poster = page.locator('#results-area .result-item').first();
    await expect(poster).toBeVisible();
    await poster.scrollIntoViewIfNeeded(); // o mouse só passa por cima do que está na tela
    const box = await poster.boundingBox();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.05);
    await expect(poster).toHaveClass(/is-tilting/);
    const tilt = await poster.evaluate(el => [el.style.getPropertyValue('--tilt-x'), el.style.getPropertyValue('--tilt-y')].map(parseFloat));
    expect(tilt[0]).toBeGreaterThan(5); // em cima: inclina para trás
    expect(tilt[1]).toBeGreaterThan(5); // à direita
    expect(await poster.evaluate(el => getComputedStyle(el).transform)).toMatch(/^matrix3d/);

    await page.mouse.move(5, 5);
    await expect(poster).not.toHaveClass(/is-tilting/);
  });

  test.describe('com "reduzir movimento"', () => {
    test.use({ reducedMotion: 'reduce' });
    test('não inclina', async ({ page }) => {
      await enterAsGuest(page);
      await page.locator('#btn-top10').click();
      const poster = page.locator('#results-area .result-item').first();
      await expect(poster).toBeVisible();
      const box = await poster.boundingBox();
      await page.mouse.move(box.x + 10, box.y + 10);
      await page.mouse.move(box.x + 20, box.y + 20);
      await page.waitForTimeout(200);
      await expect(poster).not.toHaveClass(/is-tilting/);
    });
  });
});

test.describe('como usar', () => {
  test('o ? do topo abre o guia com todos os tópicos fechados', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-help').click();
    const modal = page.locator('#modal-help');
    await expect(modal).toBeVisible();
    await expect(modal.locator('details.help__topic')).toHaveCount(13);
    await expect(modal.locator('details[open]')).toHaveCount(0);
    await modal.getByText('Match: decidir em dupla').click();
    await expect(modal.locator('#guia-match')).toHaveAttribute('open', '');
    await page.getByRole('button', { name: 'Entendi' }).click();
    await expect(modal).toBeHidden();
    await expect(page.locator('#btn-help')).toBeFocused();
  });

  test('"Como funcionam?" dos filtros abre direto no tópico dos filtros, e o rodapé também abre o guia', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('[data-action="openHelp"][data-arg="guia-filtros"]').click();
    await expect(page.locator('#guia-filtros')).toHaveAttribute('open', '');
    await expect(page.locator('#modal-help details[open]')).toHaveCount(1);
    await expect(page.locator('#guia-filtros summary')).toBeFocused();
    await expect(page.locator('#guia-filtros')).toContainText('Os filtros valem para tudo');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-help')).toBeHidden();

    await page.locator('[data-action="openHelp"][data-arg="guia-outros"]').click();
    await expect(page.locator('#guia-outros')).toHaveAttribute('open', '');
    await expect(page.locator('#guia-filtros')).not.toHaveAttribute('open', '');
    await page.keyboard.press('Escape');

    await page.locator('.site-footer [data-action="openHelp"]').click();
    await expect(page.locator('#modal-help')).toBeVisible();
  });

  test('a batalha diz quais filtros estão valendo', async ({ page }) => {
    await page.route('**/functions/v1/tmdb/discover/**', route => route.fulfill({ contentType: 'application/json', json: { results: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, title: `L${i}`, poster_path: `/${i}.jpg`, vote_average: 7, release_date: '2015-01-01' })) } }));
    await enterAsGuest(page);
    await page.locator('#btn-batalha').click();
    await expect(page.locator('#battle-filters')).toHaveText('Filmes · todos os gêneros');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-battle')).toBeHidden();
    await page.locator('#input-genero').selectOption('27');
    await page.locator('#input-country').selectOption('JP');
    await page.locator('#year-from').fill('1990');
    await page.locator('#btn-batalha').click();
    await expect(page.locator('#battle-filters')).toHaveText('Filmes · Terror · Japão · desde 1990');
  });
});

test('no celular estreito o ? sai do topo, e o guia continua no rodapé', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await enterAsGuest(page);
  await expect(page.locator('#btn-help')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  // O avatar fica inteiro e o logo não é cortado em nenhuma largura de celular (antes o avatar ficava com ~6px)
  for (const width of [320, 345, 360, 390, 430, 441, 480]) {
    await page.setViewportSize({ width, height: 700 });
    const m = await page.evaluate(() => {
      const h = document.querySelector('.logo h1');
      return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, avatar: document.querySelector('#user-avatar').getBoundingClientRect().width, clip: h.scrollWidth - h.getBoundingClientRect().width };
    });
    expect(m.over, `${width}px`).toBe(0);
    expect(m.avatar, `${width}px`).toBe(36);
    expect(m.clip, `${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 360, height: 700 });
  await page.locator('.site-footer [data-action="openHelp"]').click();
  await expect(page.locator('#modal-help')).toBeVisible();
});

test.describe('cine-batalha: sinopse', () => {
  const item = id => ({ id, title: `Lutador ${id}`, overview: `Sinopse do lutador ${id}, que enfrenta tudo.`, poster_path: `/${id}.jpg`, vote_average: 7.5, release_date: '2015-01-01' });
  const routeBattle = page => page.route('**/functions/v1/tmdb/discover/**', route => route.fulfill({ contentType: 'application/json', json: { results: Array.from({ length: 8 }, (_, i) => item(i + 1)) } }));
  const opacity = loc => loc.evaluate(el => Number(getComputedStyle(el).opacity));

  test('com mouse: passar por cima mostra a sinopse, sem votar; o botão "Sinopse" nem aparece', async ({ page }) => {
    await routeBattle(page);
    await enterAsGuest(page);
    await page.locator('#btn-batalha').click();
    const left = page.locator('#battle-arena .battle__fighter').first();
    const synopsis = left.locator('.battle__synopsis');
    await expect(synopsis).toHaveText(/^Sinopse do lutador \d+, que enfrenta tudo\.$/);
    await expect(left).toHaveAttribute('aria-describedby', 'battle-synopsis-0');
    await expect(page.locator('#battle-arena .battle__info').first()).toBeHidden();
    expect(await opacity(synopsis)).toBe(0);
    await left.hover();
    await expect.poll(() => opacity(synopsis)).toBe(1);
    await expect(page.locator('#battle-stage')).toHaveText('Quartas de final · duelo 1 de 4');
  });

  test.describe('no celular (toque)', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('"Sinopse" mostra e esconde sem votar; tocar no pôster vota', async ({ page }) => {
      await routeBattle(page);
      await enterAsGuest(page);
      await page.locator('#btn-batalha').tap();
      const info = page.locator('#battle-arena .battle__info').first();
      const synopsis = page.locator('#battle-synopsis-0');
      await expect(info).toBeVisible();
      await expect(info).toHaveAttribute('aria-expanded', 'false');
      await expect(info).toHaveAttribute('aria-controls', 'battle-synopsis-0');

      await info.tap();
      await expect(info).toHaveAttribute('aria-expanded', 'true');
      await expect(info).toHaveText('Esconder');
      await expect.poll(() => opacity(synopsis)).toBe(1);
      await expect(page.locator('#battle-stage')).toHaveText('Quartas de final · duelo 1 de 4'); // não votou

      await info.tap();
      await expect(info).toHaveText('Sinopse');
      await expect.poll(() => opacity(synopsis)).toBe(0);

      await page.locator('#battle-arena .battle__fighter').first().tap();
      await expect(page.locator('#battle-stage')).toHaveText('Quartas de final · duelo 2 de 4');
      await expect(page.locator('#battle-arena .battle__info').first()).toHaveAttribute('aria-expanded', 'false'); // nova dupla começa fechada
    });
  });
});

test.describe('cine-batalha: trilha e voltar', () => {
  const item = id => ({ id, title: `Lutador ${id}`, overview: 'x', poster_path: `/${id}.jpg`, vote_average: 7.5, release_date: '2015-01-01' });
  const marks = page => page.locator('#battle-track .battle__mark').evaluateAll(els => els.map(e => e.className.replace('battle__mark is-', '')));
  const pair = page => page.locator('#battle-arena .battle__name').allTextContents();

  test.beforeEach(async ({ page }) => {
    await page.route('**/functions/v1/tmdb/discover/**', route => route.fulfill({ contentType: 'application/json', json: { results: Array.from({ length: 8 }, (_, i) => item(i + 1)) } }));
    await enterAsGuest(page);
    await page.locator('#btn-batalha').click();
    await expect(page.locator('#modal-battle')).toBeVisible();
  });

  test('a trilha mostra as três fases e acompanha cada duelo', async ({ page }) => {
    await expect(page.locator('#battle-track .battle__stage-name')).toHaveText(['Quartas', 'Semi', 'Final']);
    expect(await marks(page)).toEqual(['current', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo']);
    for (let i = 0; i < 3; i++) await page.locator('#battle-arena .battle__fighter').first().click();
    await expect(page.locator('#battle-stage')).toHaveText('Quartas de final · duelo 4 de 4');
    expect(await marks(page)).toEqual(['done', 'done', 'done', 'current', 'todo', 'todo', 'todo']);
    await page.locator('#battle-arena .battle__fighter').first().click();
    await expect(page.locator('#battle-stage')).toHaveText('Semifinal · duelo 1 de 2');
    await expect(page.locator('#battle-track .battle__stage-group.is-active .battle__stage-name')).toHaveText('Semi');
  });

  test('"Voltar" desfaz um voto por vez, entre fases e depois do campeão', async ({ page }) => {
    const undo = page.locator('#battle-undo');
    await expect(undo).toBeHidden(); // nada para desfazer ainda
    const first = await pair(page);
    await page.locator('#battle-arena .battle__fighter').first().click();
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(page.locator('#battle-stage')).toHaveText('Quartas de final · duelo 1 de 4');
    expect(await pair(page)).toEqual(first);
    await expect(undo).toBeHidden();
    await expect(page.locator('#battle-arena .battle__fighter').first()).toBeFocused();

    // Fecha as quartas e volta: a última dupla das quartas reaparece
    for (let i = 0; i < 4; i++) await page.locator('#battle-arena .battle__fighter').nth(1).click();
    await expect(page.locator('#battle-stage')).toHaveText('Semifinal · duelo 1 de 2');
    await undo.click();
    await expect(page.locator('#battle-stage')).toHaveText('Quartas de final · duelo 4 de 4');
    await page.locator('#battle-arena .battle__fighter').first().click(); // agora o da esquerda

    // Até o campeão, e voltar para a final para escolher o outro
    for (let i = 0; i < 3; i++) await page.locator('#battle-arena .battle__fighter').first().click();
    await expect(page.locator('#battle-stage')).toHaveText('Campeão');
    const winner = await page.locator('#battle-champion-name').textContent();
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(page.locator('#battle-stage')).toHaveText('Final');
    await expect(page.locator('#battle-result')).toBeHidden();
    await page.locator('#battle-arena .battle__fighter').nth(1).click();
    await expect(page.locator('#battle-champion-name')).not.toHaveText(winner);
  });

  test('"Nova batalha" começa sem nada para desfazer', async ({ page }) => {
    for (let i = 0; i < 7; i++) await page.locator('#battle-arena .battle__fighter').first().click();
    await page.getByRole('button', { name: 'Nova batalha' }).click();
    await expect(page.locator('#battle-stage')).toHaveText('Quartas de final · duelo 1 de 4');
    await expect(page.locator('#battle-undo')).toBeHidden();
  });
});
