// Etapa 4 do redesign: filtros em pílulas, "Mais filtros" e busca no alto do Início
import { test, expect, enterAsGuest, expandFilters, lastDiscover, openMoreFilters, pickChip } from './support/app.js';

const chips = (page, id) => page.locator(`.chip-group[data-chips-for="${id}"] .chip`);
const chip = (page, id, value) => page.locator(`.chip-group[data-chips-for="${id}"] .chip[data-value="${value}"]`);
const loginAsGuest = page => page.locator('#login-form [data-action="loginAsGuest"]').click();

test.describe('filtros em pílulas', () => {
  test('tocar escolhe, tocar de novo volta para "Todos"; o valor vale no sorteio', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await expandFilters(page);
    await expect(page.locator('#input-genero')).toBeHidden(); // o select só guarda o valor
    await expect(chip(page, 'input-genero', '')).toHaveAttribute('aria-checked', 'true');

    await chip(page, 'input-genero', '27').click();
    await expect(chip(page, 'input-genero', '27')).toHaveAttribute('aria-checked', 'true');
    await expect(chip(page, 'input-genero', '')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#input-genero')).toHaveValue('27');
    await expect(page).toHaveURL(/genero=27/);

    await page.locator('#btn-top10').click();
    await expect(page.locator('.result-item').first()).toBeVisible();
    expect(lastDiscover(tmdbUrls).searchParams.get('with_genres')).toBe('27');

    await chip(page, 'input-genero', '27').click();
    await expect(page.locator('#input-genero')).toHaveValue('');
    await expect(chip(page, 'input-genero', '')).toHaveAttribute('aria-checked', 'true');
  });

  test('gênero e clima se excluem também nas pílulas', async ({ page }) => {
    await enterAsGuest(page);
    await pickChip(page, 'input-genero', '28');
    await pickChip(page, 'input-mood', 'chorar');
    await expect(chip(page, 'input-mood', 'chorar')).toHaveAttribute('aria-checked', 'true');
    await expect(chip(page, 'input-genero', '')).toHaveAttribute('aria-checked', 'true');
  });

  test('"Ver todos" mostra o resto dos gêneros; o escolhido fica à vista mesmo recolhido', async ({ page }) => {
    await page.goto('/?genero=37'); // Faroeste não está entre os de cara
    await loginAsGuest(page);
    await expandFilters(page);
    await expect(chip(page, 'input-genero', '37')).toHaveAttribute('aria-checked', 'true');
    await expect(chips(page, 'input-genero')).toHaveCount(11); // Todos + 8 + Natal + Faroeste

    const more = page.locator('[data-chips-expand]');
    await expect(more).toHaveText('Ver todos (+8)');
    await more.click();
    await expect(chips(page, 'input-genero')).toHaveCount(19);
    await expect(page.locator('[data-chips-expand]')).toHaveText('Ver menos');
    await expect(page.locator('[data-chips-expand]')).toBeFocused();
  });

  test('pelo teclado: as setas andam entre as pílulas e escolhem', async ({ page }) => {
    await enterAsGuest(page);
    await expandFilters(page);
    await chip(page, 'duration-select', '').focus();
    await page.keyboard.press('ArrowRight');
    await expect(chip(page, 'duration-select', 'short')).toBeFocused();
    await expect(page.locator('#duration-select')).toHaveValue('short');
    await expect(chip(page, 'duration-select', 'short')).toHaveAttribute('tabindex', '0');
  });

  test('onde assistir mostra os logos dos serviços; sem a lista do TMDB, os nomes', async ({ page }) => {
    await page.route(/\/functions\/v1\/tmdb\/watch\/providers\/movie/, route => route.fulfill({
      contentType: 'application/json',
      json: { results: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }] },
    }));
    await enterAsGuest(page);
    await expandFilters(page);
    const netflix = chip(page, 'input-provider', '8');
    await expect(netflix).toHaveAttribute('aria-label', 'Netflix');
    await expect(netflix.locator('img')).toHaveAttribute('src', /\/netflix\.jpg$/);
    await expect(chip(page, 'input-provider', '119')).toHaveText('Prime Video'); // sem logo na lista: o nome
    await netflix.click();
    await expect(page.locator('#input-provider')).toHaveValue('8');
  });

  test('Natal pede a palavra-chave de Natal ao TMDB', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await pickChip(page, 'input-genero', 'natal');
    await expect(page).toHaveURL(/genero=natal/);
    await page.locator('#btn-top10').click();
    await expect(page.locator('.result-item').first()).toBeVisible();
    const url = lastDiscover(tmdbUrls);
    expect(url.searchParams.get('with_keywords')).toBe('207317');
    expect(url.searchParams.has('with_genres')).toBe(false);
  });
});

test.describe('Filtros recolhíveis', () => {
  test('começam recolhidos, o resumo mostra o que vale e abrir fica lembrado', async ({ page }) => {
    await enterAsGuest(page);
    const toggle = page.locator('#filters-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#filters-body')).toBeHidden();
    await expect(page.locator('#filters-summary')).toHaveText('Nenhum filtro: vale tudo');

    await pickChip(page, 'input-genero', '27');
    await pickChip(page, 'duration-select', 'short');
    await toggle.click(); // recolhe
    await expect(page.locator('#filters-body')).toBeHidden();
    await expect(page.locator('#filters-summary')).toHaveText('Terror · Até 1h30');

    await toggle.click(); // abre, e fica lembrado
    await page.reload();
    await loginAsGuest(page);
    await expect(page.locator('#filters-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#filters-body')).toBeVisible();
  });
});

test.describe('Mais filtros', () => {
  test('fechado, mostra quantos estão ativos', async ({ page }) => {
    await enterAsGuest(page);
    const details = page.locator('#more-filters');
    await expect(details).not.toHaveAttribute('open', '');
    await expect(page.locator('#more-filters-count')).toBeHidden();

    await openMoreFilters(page);
    await page.locator('#input-country').selectOption('JP');
    await page.locator('#year-from').fill('1990');
    await expect(page.locator('#more-filters-count')).toHaveText('2 ativos');
    await page.locator('#more-filters summary').click(); // fecha: o número continua à vista
    await expect(page.locator('#more-filters-count')).toBeVisible();
  });

  test('link com país já abre os filtros e o "Mais filtros"', async ({ page }) => {
    await page.goto('/?pais=JP');
    await loginAsGuest(page);
    await expect(page.locator('#filters-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#more-filters')).toHaveAttribute('open', '');
    await expect(page.locator('#more-filters-count')).toHaveText('1 ativo');
    await expect(page.locator('#input-country')).toBeVisible();
  });

  test('link com pessoa mostra a pílula dela, conta como filtro e tirar limpa o link', async ({ page }) => {
    await page.goto('/?pessoa=31&pessoaNome=Tom%20Hanks');
    await loginAsGuest(page);
    await expect(page.locator('#selected-person')).toBeVisible();
    await expect(page.locator('#person-name')).toHaveText('Tom Hanks');
    await expect(page.locator('#more-filters-count')).toHaveText('1 ativo');
    await expect(page.locator('#filters-summary')).toHaveText(/Tom Hanks/);

    await page.locator('#selected-person').click();
    await expect(page.locator('#selected-person')).toBeHidden();
    await expect(page.locator('#more-filters-count')).toBeHidden();
    await expect(page).not.toHaveURL(/pessoa/);
  });
});

test.describe('busca no alto do Início', () => {
  test('busca, Top 10 e Lançamentos vêm antes do sorteio, com os resultados logo abaixo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterAsGuest(page);
    const search = await page.locator('#direct-search').boundingBox();
    const draw = await page.locator('#btn-sortear').boundingBox();
    expect(search.y).toBeLessThan(draw.y);
    await expect(page.locator('#direct-search')).toBeInViewport();
    await expect(page.locator('#btn-top10')).toBeInViewport();

    await page.locator('#btn-top10').click();
    const first = page.locator('#results-area .result-item').first();
    await expect(first).toBeVisible();
    const pills = await page.locator('.home-search__lists').boundingBox();
    const result = await first.boundingBox();
    expect(result.y).toBeGreaterThan(pills.y);
    const drawNow = await page.locator('#btn-sortear').boundingBox();
    expect(result.y).toBeLessThan(drawNow.y); // logo abaixo das pílulas, antes do sorteio (não no fim da página)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('Top 10 e Lançamentos abrem e fecham; "Fechar" esconde a lista', async ({ page }) => {
    await enterAsGuest(page);
    const top10 = page.locator('#btn-top10');
    const close = page.locator('#results-close');
    const results = page.locator('#results-area .result-item');
    await expect(close).toBeHidden();

    await top10.click();
    await expect(results.first()).toBeVisible();
    await expect(top10).toHaveAttribute('aria-pressed', 'true');
    await expect(close).toBeVisible();
    await top10.click(); // de novo: fecha
    await expect(results).toHaveCount(0);
    await expect(top10).toHaveAttribute('aria-pressed', 'false');
    await expect(close).toBeHidden();

    await page.locator('#btn-lancamentos').click();
    await expect(page.locator('#btn-lancamentos')).toHaveAttribute('aria-pressed', 'true');
    await expect(top10).toHaveAttribute('aria-pressed', 'false');
    await close.click();
    await expect(page.locator('#results-area')).toBeEmpty();
    await expect(page.locator('#btn-lancamentos')).toBeFocused();
  });

  test('mudou o tipo ou um filtro: tocar no Top 10 aberto atualiza a lista em vez de fechar', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    const top10 = page.locator('#btn-top10');
    await top10.click();
    await expect(top10).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#btn-tv').click();
    await top10.click();
    await expect.poll(() => lastDiscover(tmdbUrls).pathname).toContain('/discover/tv');
    await expect(top10).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#results-area .result-item').first()).toBeVisible();
  });

  test('tocar várias vezes no Top 10 não deixa o botão branco (nada se acumula dentro dele)', async ({ page }) => {
    await enterAsGuest(page);
    const top10 = page.locator('#btn-top10');
    const before = await top10.evaluate(el => el.children.length);
    for (let i = 0; i < 4; i++) {
      await top10.click();
      await expect(top10).toBeEnabled();
    }
    await page.waitForTimeout(700); // a onda de algum toque, se houvesse, já teria sumido
    expect(await top10.evaluate(el => el.children.length)).toBe(before);
    await expect(top10.locator('.list-pill__label')).toHaveText('Top 10');
  });
});

// Repasse da etapa 4 (2026-11-11): defeitos achados na foto de hoje
test.describe('filtros: tudo à vista', () => {
  for (const [label, size] of [['celular', { width: 390, height: 844 }], ['computador', { width: 1280, height: 900 }]]) {
    // Clima e Onde assistir cortavam na borda ("Para cho…", logo do Disney+) sem como rolar com o mouse
    test(`no ${label}, clima e onde assistir ficam inteiros, sem fileira cortada`, async ({ page }) => {
      await page.setViewportSize(size);
      await enterAsGuest(page);
      await expandFilters(page);
      for (const id of ['input-mood', 'input-provider']) {
        const group = page.locator(`.chip-group[data-chips-for="${id}"]`);
        await expect(group.locator('.chip').first()).toBeVisible();
        const box = await group.boundingBox();
        for (const c of await group.locator('.chip').all()) {
          const b = await c.boundingBox();
          expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 1);
        }
      }
    });
  }

  // "Com qual ator/diretor? (Ex: Wagne…" — o texto de exemplo não cabia no campo
  test('no celular, o texto dos campos de "Mais filtros" cabe inteiro', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterAsGuest(page);
    await expandFilters(page);
    await openMoreFilters(page);
    for (const id of ['#actor-input', '#input-similar']) {
      const fits = await page.locator(id).evaluate(el => {
        const cs = getComputedStyle(el);
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return ctx.measureText(el.placeholder).width <= room;
      });
      expect(fits, id).toBe(true);
    }
  });
});

// Busca no celular: os pôsteres não diziam o nome (só passando o mouse) — dois "Batman" ficavam iguais
test('no celular, cada resultado mostra o nome e o ano', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterAsGuest(page);
  await page.locator('#direct-search').fill('filme');
  await page.locator('#direct-search').press('Enter');
  const first = page.locator('#results-area .result-item').first();
  await expect(first.locator('.result-item__name')).toBeVisible();
  await expect(first.locator('.result-item__name')).toHaveText('Filme Um');
  await expect(first.locator('.result-item__year')).toHaveText('2020');
});

// Repasse da etapa 4: nota mínima em pílulas e "Limpar filtros"
test.describe('nota mínima e limpar', () => {
  test('escolher "7+" vale no pedido ao TMDB, no link e no resumo', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await expandFilters(page);
    await expect(chips(page, 'input-rating')).toHaveText(['Qualquer', '★ 6+', '★ 7+', '★ 8+']);
    await chip(page, 'input-rating', '7').click();
    await expect(page).toHaveURL(/nota=7/);
    await page.locator('#btn-top10').click();
    await expect(page.locator('.result-item').first()).toBeVisible();
    expect(lastDiscover(tmdbUrls).searchParams.get('vote_average.gte')).toBe('7');
    await page.locator('#filters-toggle').click(); // recolhe: o resumo diz o que vale
    await expect(page.locator('#filters-summary')).toHaveText('★ 7+');
  });

  test('"Limpar filtros" aparece com algum ativo e volta tudo ao começo', async ({ page }) => {
    await enterAsGuest(page);
    await expandFilters(page);
    const clear = page.getByRole('button', { name: 'Limpar filtros' });
    await expect(clear).toBeHidden();
    await chip(page, 'input-genero', '27').click();
    await chip(page, 'duration-select', 'short').click();
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(chip(page, 'input-genero', '')).toHaveAttribute('aria-checked', 'true');
    await expect(chip(page, 'duration-select', '')).toHaveAttribute('aria-checked', 'true');
    await expect(page).not.toHaveURL(/genero=|duracao=/);
    await expect(clear).toBeHidden();
  });
});

// Sanfona do clleancode (repasse da etapa 4): abrir os Filtros anima a altura; reduzir movimento abre na hora
test.describe('sanfona dos filtros', () => {
  const height = page => page.locator('#filters-body').evaluate(el => el.getBoundingClientRect().height);

  test('abrir passa por alturas intermediárias e termina inteiro', async ({ page }) => {
    await enterAsGuest(page);
    await expect(page.locator('#filters-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(await height(page)).toBe(0);
    await page.locator('#filters-toggle').click();
    await expect.poll(() => height(page), { intervals: [30] }).toBeGreaterThan(0);
    const mid = await height(page);
    await expect.poll(() => height(page)).toBeGreaterThan(mid); // ainda crescendo
    await expect.poll(async () => { const a = await height(page); await page.waitForTimeout(100); return a === await height(page); }).toBe(true);
    await expect(page.locator('#filters-body')).not.toHaveAttribute('inert', '');
  });

  test('com "reduzir movimento", abre na hora', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterAsGuest(page);
    await page.locator('#filters-toggle').click();
    const full = await page.locator('#filters-body').evaluate(el => el.scrollHeight);
    expect(await height(page)).toBeGreaterThanOrEqual(full - 1);
  });
});
