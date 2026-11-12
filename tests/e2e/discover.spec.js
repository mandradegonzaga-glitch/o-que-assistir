import { test, expect, enterAsGuest, modal, lastDiscover, LIST, pickChip } from './support/app.js';

test.describe('sorteio', () => {
  test('abre o modal e "Sortear outro" traz título novo, sem repetir', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-sortear').click();
    await expect(modal(page)).toBeVisible();

    const outro = page.locator('#btn-sortear-outro');
    await expect(outro).toBeVisible();

    const seen = new Set([await page.locator('#m-title').textContent()]);
    for (let i = 0; i < LIST.length - 1; i++) {
      await outro.click();
      await expect(outro).toBeEnabled();
      const current = await page.locator('#m-title').textContent();
      expect(seen.has(current), `"${current}" repetiu`).toBe(false);
      seen.add(current);
    }
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('.history-count')).toHaveText(String(LIST.length));
  });

  test('quando todos já saíram, repete em vez de falhar', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-sortear').click();
    const outro = page.locator('#btn-sortear-outro');
    await expect(outro).toBeVisible();
    for (let i = 0; i < LIST.length; i++) {
      await outro.click();
      await expect(outro).toBeEnabled();
    }
    await expect(page.locator('#toast')).not.toHaveText(/Nada encontrado/);
  });

  test('título aberto pela lista não mostra "Sortear outro"', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-top10').click();
    await page.locator('#results-area .result-item').first().click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#btn-sortear-outro')).toBeHidden();
  });

  test('o modal abre antes de as seções terminarem de carregar', async ({ page }) => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route(/\/tmdb\/.*\/credits/, async route => {
      await gate;
      await route.fulfill({ json: { cast: [{ name: 'Atriz Lenta', profile_path: null }] } });
    });

    await enterAsGuest(page);
    await page.locator('#btn-sortear').click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#cast-list')).toHaveText('Carregando elenco…');

    release();
    await expect(page.locator('#cast-list')).toContainText('Atriz Lenta');
  });

  test('falha em uma seção não afeta as outras', async ({ page }) => {
    await page.route(/\/tmdb\/.*\/credits/, route => route.fulfill({ status: 500, json: {} }));
    await enterAsGuest(page);
    await page.locator('#btn-sortear').click();
    await expect(page.locator('#cast-list')).toHaveText('Não foi possível carregar o elenco.');
    await expect(page.locator('#m-providers')).toHaveText('Indisponível em streaming');
  });
});

test.describe('clima', () => {
  test('envia os gêneros do clima, por tipo', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await pickChip(page, 'input-mood', 'adrenalina');
    await page.locator('#btn-top10').click();
    await expect(page.locator('.result-item').first()).toBeVisible();
    expect(lastDiscover(tmdbUrls).searchParams.get('with_genres')).toBe('28|12');

    await page.locator('#btn-tv').click();
    await page.locator('#btn-top10').click();
    await expect.poll(() => lastDiscover(tmdbUrls).pathname).toContain('/discover/tv');
    expect(lastDiscover(tmdbUrls).searchParams.get('with_genres')).toBe('10759');
  });

  test('gênero e clima se excluem, e o clima vai para a URL', async ({ page }) => {
    await enterAsGuest(page);
    const mood = page.locator('#input-mood');
    const genre = page.locator('#input-genero');

    await pickChip(page, 'input-mood', 'leve');
    await expect(page).toHaveURL(/clima=leve/);

    await pickChip(page, 'input-genero', '28');
    await expect(mood).toHaveValue('');
    await expect(page).not.toHaveURL(/clima=/);
    await expect(page).toHaveURL(/genero=28/);

    await pickChip(page, 'input-mood', 'tensao');
    await expect(genre).toHaveValue('');
  });

  test('link com clima restaura o filtro', async ({ page }) => {
    await page.goto('/?clima=chorar');
    await expect(page.locator('#input-mood')).toHaveValue('chorar');
  });
});

test.describe('minhas plataformas', () => {
  const choice = (page, name) => page.locator('#my-providers label', { hasText: name }).locator('input');

  test('marcar filtra o sorteio e continua depois de recarregar', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    const select = page.locator('#input-provider');
    await expect(select.locator('option[value="minhas"]')).toHaveCount(0);

    await page.locator('.user-pill').click();
    await choice(page, 'Netflix').check();
    await choice(page, 'Disney+').check();
    await page.locator('[data-action="closeModal"][data-arg="modal-profile"]').click();
    await expect(select).toHaveValue('minhas');

    await page.locator('#btn-top10').click();
    await expect(page.locator('.result-item').first()).toBeVisible();
    expect(lastDiscover(tmdbUrls).searchParams.get('with_watch_providers')).toBe('8|337');

    await page.reload();
    await expect(page.locator('#input-provider')).toHaveValue('minhas');
  });

  test('desmarcar tudo tira a opção e volta para "Todos"', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('.user-pill').click();
    const netflix = choice(page, 'Netflix');
    await netflix.check();
    await netflix.uncheck();
    await expect(page.locator('#input-provider')).toHaveValue('');
    await expect(page.locator('#input-provider option[value="minhas"]')).toHaveCount(0);
  });

  test('dá para escolher plataforma fora dos destaques, sem lojas nem canais', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await page.locator('.user-pill').click();
    await page.locator('#more-providers summary').click();

    const all = page.locator('#all-providers .provider-choice');
    await expect(all).toHaveText(['NetMovies', 'Pluto TV']);

    await page.locator('#provider-search').fill('plut');
    await expect(page.locator('#all-providers .provider-choice:visible')).toHaveText(['Pluto TV']);
    await page.locator('#provider-search').fill('xyz');
    await expect(page.locator('#providers-empty')).toBeVisible();
    await page.locator('#provider-search').fill('');

    await page.locator('#all-providers label', { hasText: 'Pluto TV' }).locator('input').check();
    await page.locator('[data-action="closeModal"][data-arg="modal-profile"]').click();
    await page.locator('#btn-top10').click();
    await expect(page.locator('.result-item').first()).toBeVisible();
    expect(lastDiscover(tmdbUrls).searchParams.get('with_watch_providers')).toBe('300');

    // Depois de recarregar, a escolhida aparece junto dos destaques
    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await page.locator('.user-pill').click();
    await expect(page.locator('#my-providers label', { hasText: 'Pluto TV' }).locator('input')).toBeChecked();
  });

  test('sem a lista do TMDB, os destaques continuam funcionando', async ({ page, errors }) => {
    await page.route('**/watch/providers/**', route => route.fulfill({ status: 500, json: {} }));
    await enterAsGuest(page);
    await page.locator('.user-pill').click();
    await expect(choice(page, 'Paramount+')).toBeVisible();
    await expect(page.locator('#more-providers')).toBeHidden();
    await choice(page, 'Apple TV').check();
    expect(await page.evaluate(() => localStorage.getItem('my_providers'))).toBe('["350"]');
    expect(errors).toEqual([]);
  });

  test('"Onde" usa os ids certos: Apple TV não é Paramount+', async ({ page }) => {
    await page.goto('/');
    const options = page.locator('#input-provider option');
    await expect(options.filter({ hasText: 'Apple TV' })).toHaveAttribute('value', '350');
    await expect(options.filter({ hasText: 'Paramount+' })).toHaveAttribute('value', '531');
  });

  test('"Onde" lista os mesmos destaques do perfil', async ({ page }) => {
    await page.goto('/');
    const labels = await page.locator('#input-provider option').allTextContents();
    expect(labels).toEqual(['Onde: Todas as plataformas', 'Netflix', 'Prime Video', 'Apple TV', 'Disney+', 'Paramount+', 'HBO Max', 'Globoplay', 'Claro video', 'Looke', 'MUBI', 'Crunchyroll', 'Escolher minhas plataformas…']);
  });

  test('"Escolher" abre o perfil, mantém o filtro e não vai para a URL', async ({ page }) => {
    await enterAsGuest(page);
    const select = page.locator('#input-provider');
    await pickChip(page, 'input-provider', '8');
    await page.locator('.chip-extras .chip[data-value="escolher"]').click(); // "Escolher minhas"
    await expect(page.locator('#modal-profile')).toBeVisible();
    await expect(page.locator('#my-providers')).toBeInViewport();
    await expect(select).toHaveValue('8');
    await expect(page).toHaveURL(/onde=8/);
    await expect(page).not.toHaveURL(/escolher/);

    await choice(page, 'MUBI').check();
    await expect(select).toHaveValue('minhas');
    await expect(select.locator('option[value="escolher"]')).toHaveText('Editar minhas plataformas…');
    await expect(page).toHaveURL(/onde=minhas/);
  });

  test('filtro de plataforma no link vence a preferência', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('my_providers', '["8"]'));
    await page.goto('/?onde=337');
    await expect(page.locator('#input-provider')).toHaveValue('337');
  });
});

test.describe('site', () => {
  test('link direto com filtros abre o título depois de entrar', async ({ page }) => {
    await page.goto('/?tipo=tv&genero=35&titulo=tv-2');
    await expect(modal(page)).toBeHidden();
    await expect(page.locator('#input-genero')).toHaveValue('35');
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('#m-title')).toHaveText('Filme Dois');
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'tv');
  });

  test('a página não mostra restos de template', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('body').textContent();
    expect(text).not.toMatch(/\$\d|\$\{|undefined|\[object/);
  });

  test('a chave do TMDB não aparece em nenhuma chamada do navegador', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await page.locator('#btn-top10').click();
    await expect(page.locator('.result-item').first()).toBeVisible();
    expect(tmdbUrls.length).toBeGreaterThan(0);
    tmdbUrls.forEach(url => expect(url.searchParams.has('api_key')).toBe(false));
  });

  test('não há handlers inline', async ({ page }) => {
    await page.goto('/');
    const inline = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => [...e.attributes].some(a => /^on/.test(a.name))).length);
    expect(inline).toBe(0);
  });

  test('celular: nada passa da largura da tela', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await enterAsGuest(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });

  test('ícones e imagem de compartilhamento existem', async ({ request }) => {
    for (const file of ['icons/icon-72.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/og-image.png']) {
      expect((await request.get(`/${file}`)).status(), file).toBe(200);
    }
  });
});

test.describe('boas-vindas', () => {
  // Repasse da etapa 5d (2026-11-11): uma tela só, com serviços e gêneros (antes, 4 telas de apresentação)
  const firstVisit = async page => {
    await page.addInitScript(() => localStorage.removeItem('has_visited'));
    await page.goto('/');
    await expect(page.locator('#onboarding-overlay')).toBeVisible();
  };
  const saved = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);

  test('uma tela só: serviços e gêneros escolhidos já deixam o app do seu jeito', async ({ page }) => {
    await firstVisit(page);
    const overlay = page.locator('#onboarding-overlay');
    await expect(overlay.locator('.onboarding-service')).toHaveCount(8);
    await expect(overlay.locator('.onboarding-genre')).toHaveCount(8);

    const netflix = overlay.getByRole('button', { name: 'Netflix' });
    await netflix.click();
    await expect(netflix).toHaveAttribute('aria-pressed', 'true');
    await overlay.getByRole('button', { name: 'Terror' }).click();
    await overlay.getByRole('button', { name: 'Continuar' }).click();
    await expect(overlay).toBeHidden();

    expect(await saved(page, 'my_providers')).toEqual(['8']);
    expect(await saved(page, 'taste_seed')).toEqual([27]);
    expect(await page.evaluate(() => localStorage.getItem('has_visited'))).toBe('true');
    // o filtro "Onde assistir" já vem com as suas plataformas
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('#input-provider')).toHaveValue('minhas');
  });

  test('Pular não guarda nada', async ({ page }) => {
    await firstVisit(page);
    await page.locator('#onboarding-overlay').getByRole('button', { name: 'Netflix' }).click();
    await page.locator('#onboarding-overlay').getByRole('button', { name: 'Pular' }).click();
    await expect(page.locator('#onboarding-overlay')).toBeHidden();
    expect(await saved(page, 'my_providers')).toBeNull();
    expect(await saved(page, 'taste_seed')).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('has_visited'))).toBe('true');
  });

  test('os serviços entram um a um (clleancode)', async ({ page }) => {
    await firstVisit(page);
    const delays = await page.locator('.onboarding-service').evaluateAll(els => els.slice(0, 3).map(el => getComputedStyle(el).animationDelay));
    expect(delays).toEqual(['0s', '0.06s', '0.12s']);
  });

  // Repasse da etapa 2 (2026-11-11): quem chega pela primeira vez por um link de título via as
  // boas-vindas por cima do título. Agora o título vem primeiro e as boas-vindas, ao fechá-lo.
  test('pelo link de um título, as boas-vindas esperam o título fechar', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('has_visited'));
    await page.goto('/?titulo=movie-1');
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#m-title')).toHaveText('Filme Um');
    await page.waitForTimeout(800); // as boas-vindas abriam 500 ms depois de carregar
    await expect(page.locator('#onboarding-overlay')).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(modal(page)).toBeHidden();
    await expect(page.locator('#onboarding-overlay')).toBeVisible();
  });
});

// Repasse da etapa 1 (2026-11-11): selos no pôster da grade
test.describe('selos no pôster', () => {
  test('a nota fica no canto; "Estreia" só no que saiu dentro do período dos Lançamentos', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 6, 12, 0));
    const recent = { ...LIST[0], id: 50, title: 'Saiu Agora', release_date: '2026-10-30' };
    const old = { ...LIST[1], id: 51, title: 'Antigo', release_date: '2020-01-01', vote_average: 0 };
    await page.route(/\/tmdb\/discover\//, route => route.fulfill({ contentType: 'application/json', json: { results: [recent, old] } }));
    await enterAsGuest(page);
    await page.locator('#btn-top10').click();

    const first = page.locator('#results-area .result-item').first();
    await expect(first.locator('.poster-badge--rating')).toHaveText('8,5');
    await expect(first.locator('.poster-badge--premiere')).toHaveText('Estreia');
    await expect(first).toHaveAttribute('aria-label', 'Saiu Agora, posição 1, nota 8,5, estreia');

    const second = page.locator('#results-area .result-item').nth(1);
    await expect(second.locator('.poster-badge')).toHaveCount(0); // sem nota e antigo: nada no pôster
    await expect(second).toHaveAttribute('aria-label', 'Antigo, posição 2');

    // o selo da nota não cobre o número do Top 10
    const [rank, badge] = await Promise.all([first.locator('.result-rank').boundingBox(), first.locator('.poster-badge--rating').boundingBox()]);
    expect(rank.x + rank.width).toBeLessThan(badge.x);
  });
});

// Repasse da etapa 4: o que a pessoa já viu ganha o selo "Já vi" no pôster (o sorteio já deixa de fora;
// a busca e as listas não avisavam)
test('selo "Já vi" no pôster do que já foi visto', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('guest_history', JSON.stringify([{ id: 2, title: 'Filme Dois', poster: '/2.jpg', type: 'movie' }])));
  await enterAsGuest(page);
  await page.locator('#btn-top10').click();
  const seen = page.locator('#results-area .result-item[data-id="2"]');
  await expect(seen.locator('.poster-badge--seen')).toHaveText('Já vi');
  await expect(seen).toHaveAttribute('aria-label', /, já visto$/);
  await expect(page.locator('#results-area .result-item[data-id="1"] .poster-badge--seen')).toHaveCount(0);
});

// Resultados entrando em sequência (efeito do clleancode, repasse da etapa 4): 30 ms entre um e
// outro, no máximo 10 de espera; com "reduzir movimento", todos juntos e sem animar
test.describe('resultados em sequência', () => {
  const timing = page => page.locator('#results-area .result-item').evaluateAll(els => els.map(el => {
    const cs = getComputedStyle(el);
    return { name: cs.animationName, delay: parseFloat(cs.animationDelay) };
  }));

  test('cada pôster entra um pouco depois do anterior', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-top10').click();
    await expect(page.locator('#results-area .result-item')).toHaveCount(5);
    const t = await timing(page);
    expect(t.every(x => x.name === 'result-in')).toBe(true);
    expect(t.map(x => x.delay)).toEqual([0, 0.03, 0.06, 0.09, 0.12]);
  });

  test('com "reduzir movimento", sem animação', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterAsGuest(page);
    await page.locator('#btn-top10').click();
    await expect(page.locator('#results-area .result-item')).toHaveCount(5);
    expect((await timing(page)).every(x => x.name === 'none')).toBe(true);
  });
});
