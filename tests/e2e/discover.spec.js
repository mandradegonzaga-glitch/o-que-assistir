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
    await page.route('**/credits**', async route => {
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
    await page.route('**/credits**', route => route.fulfill({ status: 500, json: {} }));
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
  test('cada passo tem um ícone próprio', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('has_visited'));
    await page.goto('/');
    const icon = page.locator('#onboarding-icon');
    await expect(icon.locator('svg')).toBeVisible();

    const seen = new Set();
    for (let step = 0; step < 4; step++) {
      seen.add(await icon.innerHTML());
      await page.locator('#onboarding-btn').click();
    }
    expect(seen.size).toBe(4);
    await expect(page.locator('#onboarding-overlay')).toBeHidden();
  });
});
