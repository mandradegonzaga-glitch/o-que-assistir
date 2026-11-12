// Etapa 3 do redesign: barra de baixo no celular, Biblioteca em tela própria e "Continue assistindo" no Início
import { test, expect, enterAsGuest, modal } from './support/app.js';

const phone = { width: 390, height: 844 };

// Convidado com uma série começada neste aparelho (1 de 3 episódios)
const seedSeries = page => page.addInitScript(() => {
  if (sessionStorage.getItem('__seeded')) return;
  sessionStorage.setItem('__seeded', '1');
  localStorage.setItem('guest_episodes', JSON.stringify({
    1: { id: 1, title: 'Série Um', poster: '/s1.jpg', type: 'tv', keys: ['1-s1-e1'], updatedAt: 1 },
  }));
});

test.describe('barra de baixo (celular)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(phone);
  });

  test('troca de tela, marca a atual e o nome fica junto do ícone', async ({ page }) => {
    await enterAsGuest(page);
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav).toBeVisible();
    await expect(page.locator('.mode-tabs')).toBeHidden();
    await expect(page.locator('#nav-discover')).toHaveAttribute('aria-current', 'page');

    await page.locator('#nav-library').click();
    await expect(page.locator('#view-library')).toBeVisible();
    await expect(page.locator('#view-discover')).toBeHidden();
    await expect(page.locator('#nav-library')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#nav-discover')).not.toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveURL(/modo=library/);

    await page.locator('#nav-roulette').click();
    await expect(page.locator('#view-roulette')).toBeVisible();
    await page.locator('#nav-discover').click();
    await expect(page.locator('#view-discover')).toBeVisible();
    await expect(page).not.toHaveURL(/modo=/);
  });

  test('o Sortear do meio fica no centro em qualquer tela e sorteia de onde estiver', async ({ page }) => {
    await enterAsGuest(page);
    const center = async () => {
      const box = await page.locator('#nav-sortear').boundingBox();
      return Math.round(box.x + box.width / 2);
    };
    const atHome = await center();
    expect(Math.abs(atHome - phone.width / 2)).toBeLessThanOrEqual(2);
    await page.locator('#nav-library').click();
    expect(await center()).toBe(atHome);

    await page.locator('#nav-sortear').click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#m-title')).not.toBeEmpty();
  });

  test('o fim da página não fica escondido atrás da barra', async ({ page }) => {
    await enterAsGuest(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await page.locator('.site-footer').boundingBox();
    const bar = await page.locator('.bottom-nav').boundingBox();
    expect(footer.y + footer.height).toBeLessThanOrEqual(bar.y);
  });
});

test.describe('Biblioteca em tela própria', () => {
  test('no computador, é uma aba do topo e o link volta para ela', async ({ page }) => {
    await enterAsGuest(page);
    await expect(page.locator('.bottom-nav')).toBeHidden();
    await expect(page.locator('#view-library')).toBeHidden(); // não fica mais no fim do Início
    await page.locator('#tab-mode-library').click();
    await expect(page.locator('#view-library')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Biblioteca', level: 2 })).toBeVisible();

    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('#view-library')).toBeVisible();
    await expect(page.locator('#tab-mode-library')).toHaveAttribute('aria-selected', 'true');
  });

  // Repasse da etapa 1 (2026-11-11): no celular a 2ª aba aparecia cortada ("Em Andament…") e as
  // outras ficavam fora da tela, sem nada dizendo que a fileira rolava. Todas inteiras e à vista.
  test('no celular, as 4 abas aparecem inteiras', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await enterAsGuest(page);
    await page.locator('.bottom-nav').getByRole('button', { name: 'Biblioteca' }).click();
    await page.locator('#library-overview [data-arg="watchlist"]').click(); // a Biblioteca abre na visão geral
    const tabs = page.locator('.library-tabs .library-tab');
    await expect(tabs.first()).toBeVisible(); // depois do leque
    await expect(tabs).toHaveCount(4);
    // 2 colunas, não uma embaixo da outra
    const [first, second] = await tabs.evaluateAll(els => els.slice(0, 2).map(e => e.getBoundingClientRect().top));
    expect(second).toBe(first);
    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
      expect(await tab.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
  });
});

test.describe('Continue assistindo', () => {
  test('mostra a série começada com o próximo episódio; "Ver tudo" leva a Em Andamento', async ({ page }) => {
    await seedSeries(page);
    await enterAsGuest(page);
    const row = page.locator('#continue-row');
    await expect(row).toBeVisible();
    const card = row.locator('.home-card');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.home-card__title')).toHaveText('Série Um');
    await expect(card.locator('.home-card__meta')).toHaveText('T01E02 · 2 restantes');
    await expect(card).toHaveAttribute('aria-label', 'Continuar Série Um, próximo T01E02, 2 restantes');
    // sozinho, o cartão ocupa a largura da fileira (antes ficava com metade e um vazio ao lado)
    const [cardBox, rowBox] = await Promise.all([card.boundingBox(), row.locator('.home-row__list').boundingBox()]);
    expect(cardBox.width).toBeGreaterThan(rowBox.width * 0.95);

    await row.getByRole('button', { name: 'Ver tudo' }).click();
    await expect(page.locator('#view-library')).toBeVisible();
    await expect(page.locator('#tab-andando')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.up-next-card')).toHaveCount(1);
  });

  test('tocar na série abre os episódios', async ({ page }) => {
    await seedSeries(page);
    await enterAsGuest(page);
    await page.locator('#continue-row .home-card').click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#episodes-section')).toBeVisible();
  });

  test('sem série começada, a fileira não aparece', async ({ page }) => {
    await enterAsGuest(page);
    await expect(page.locator('#daily-row')).toBeVisible();
    await expect(page.locator('#continue-row')).toBeHidden();
  });
});

// Acabamento do redesign: quem pede menos movimento não fica vendo a roda girar 4 segundos
test.describe('reduzir movimento', () => {
  test('a roleta mostra o resultado logo, sem 4 segundos de roda parada', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterAsGuest(page);
    await page.locator('#tab-mode-roulette').click();
    for (const name of ['Duna', 'Matrix']) {
      await page.locator('#roulette-input').fill(name);
      await page.locator('#roulette-input').press('Enter');
    }
    await page.locator('#btn-girar').click();
    await expect(page.locator('#roulette-winner')).toBeVisible({ timeout: 1800 });
  });

  test('sem a preferência, o giro continua longo', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#tab-mode-roulette').click();
    for (const name of ['Duna', 'Matrix']) {
      await page.locator('#roulette-input').fill(name);
      await page.locator('#roulette-input').press('Enter');
    }
    await page.locator('#btn-girar').click();
    await expect(page.locator('#roulette-wheel')).toHaveCSS('transition-duration', '4s');
  });
});

// Toque não deixa o cartão "levantado": os efeitos de hover só valem com mouse
test('no celular, tocar num resultado não deixa o hover preso', async ({ browser }) => {
  const context = await browser.newContext({ viewport: phone, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await enterAsGuest(page);
  const hoverRules = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const r of rules) if (r.selectorText?.includes(':hover')) out.push(r.selectorText);
    }
    return out;
  });
  expect(hoverRules).toEqual([]);
  await context.close();
});

// Filme, Série e Dorama em pílulas numa fileira (no lugar das 3 caixas grandes)
for (const [label, viewport] of [['celular', { width: 390, height: 844 }], ['estreito', { width: 320, height: 640 }], ['computador', { width: 1280, height: 800 }]]) {
  test(`tipo em 3 pílulas numa fileira (${label})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await enterAsGuest(page);
    const pills = ['#btn-movie', '#btn-tv', '#btn-dorama'].map(id => page.locator(id));
    const boxes = await Promise.all(pills.map(p => p.boundingBox()));
    expect(new Set(boxes.map(b => Math.round(b.y))).size).toBe(1);
    for (const b of boxes) expect(Math.round(b.height)).toBe(52);
    expect(Math.abs(boxes[0].width - boxes[2].width)).toBeLessThan(1);
    // Nenhum nome é cortado pela borda da pílula
    for (const p of pills) {
      const [pill, label] = [await p.boundingBox(), await p.locator('.card__label').boundingBox()];
      expect(label.x).toBeGreaterThanOrEqual(pill.x);
      expect(label.x + label.width).toBeLessThanOrEqual(pill.x + pill.width);
    }
    // A escolhida fica preenchida na cor do tipo e pode ser trocada pelas setas
    await expect(pills[0]).toHaveCSS('background-color', 'rgb(255, 201, 77)');
    await pills[0].focus();
    await page.keyboard.press('ArrowRight');
    await expect(pills[1]).toHaveAttribute('aria-checked', 'true');
    await expect(pills[1]).toHaveCSS('background-color', 'rgb(61, 214, 198)');
  });
}
