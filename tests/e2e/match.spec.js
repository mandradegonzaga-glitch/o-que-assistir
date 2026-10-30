import { test, expect, enterAsGuest, modal, LIST } from './support/app.js';

const voteAll = async (page, wanted) => {
  for (let i = 0; i < LIST.length; i++) {
    await expect(page.locator('#match-counter')).toHaveText(`${i + 1} de ${LIST.length}`);
    const title = await page.locator('.match-card__title').textContent();
    await page.locator(wanted(title) ? '[data-action="matchYes"]' : '[data-action="matchNo"]').click();
  }
};

const start = async (page, names = ['Ana', 'Bia']) => {
  await enterAsGuest(page);
  await page.locator('#tab-mode-match').click();
  await page.locator('#match-name-1').fill(names[0]);
  await page.locator('#match-name-2').fill(names[1]);
  await page.locator('#btn-match-start').click();
  await expect(page.locator('#match-voting')).toBeVisible();
};

const inviteAs = async (page, name, wanted) => {
  await enterAsGuest(page);
  await page.locator('#tab-mode-match').click();
  await page.locator('#match-name-1').fill(name);
  await page.locator('#btn-match-invite').click();
  await voteAll(page, wanted);
  await expect(page.locator('#match-invite')).toBeVisible();
  return page.locator('#match-link').inputValue();
};

const freshVisitor = async (page) => {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
};

test.describe('match', () => {
  test('cada pessoa vota sem ver a outra e o resultado traz o que coincidiu', async ({ page }) => {
    await start(page);
    await expect(page.locator('#match-player')).toHaveText('Ana');
    await voteAll(page, t => ['Filme Um', 'Filme Dois'].includes(t));

    await expect(page.locator('#match-pass-name')).toHaveText('Bia');
    await expect(page.locator('#match-voting')).toBeHidden();
    await page.locator('#btn-match-continue').click();

    await expect(page.locator('#match-player')).toHaveText('Bia');
    await voteAll(page, t => ['Filme Dois', 'Filme Três'].includes(t));

    await expect(page.locator('#match-result-title')).toHaveText('Deu match!');
    await expect(page.locator('.match-result-item')).toHaveText(['Filme Dois']);
    await expect(page.locator('#btn-match-draw')).toBeHidden();

    await page.locator('.match-result-item').click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#m-title')).toHaveText('Filme Dois');
  });

  test('sem coincidência explica e permite recomeçar', async ({ page }) => {
    await start(page);
    await voteAll(page, t => t === 'Filme Um');
    await page.locator('#btn-match-continue').click();
    await voteAll(page, t => t === 'Filme Dois');
    await expect(page.locator('#match-result-title')).toHaveText('Nenhum título em comum');

    await page.locator('#match-result [data-action="matchRestart"]').click();
    await expect(page.locator('#match-setup')).toBeVisible();
  });

  test('vários matches permitem sortear entre eles', async ({ page }) => {
    await start(page);
    await voteAll(page, () => true);
    await page.locator('#btn-match-continue').click();
    await voteAll(page, () => true);
    await expect(page.locator('#match-result-title')).toHaveText(`${LIST.length} matches!`);
    await page.locator('#btn-match-draw').click();
    await expect(modal(page)).toBeVisible();
  });

  test('setas do teclado votam', async ({ page }) => {
    await start(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#match-counter')).toHaveText(`2 de ${LIST.length}`);
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#match-counter')).toHaveText(`3 de ${LIST.length}`);
  });

  test('nomes em branco usam um padrão e HTML aparece como texto', async ({ page }) => {
    await start(page, ['', '<b>x</b>']);
    await expect(page.locator('#match-player')).toHaveText('Pessoa 1');
    await voteAll(page, () => false);
    await expect(page.locator('#match-pass-name')).toHaveText('<b>x</b>');
  });

  test('match dá XP', async ({ page }) => {
    await start(page);
    await voteAll(page, () => true);
    await page.locator('#btn-match-continue').click();
    await voteAll(page, () => true);
    await page.locator('.user-pill').click();
    await expect(page.locator('#xp-log')).toContainText('+15 XP · Match');
  });

  test('o modo vai para a URL e o celular não estoura a largura', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await enterAsGuest(page);
    await page.locator('#tab-mode-match').click();
    await expect(page).toHaveURL(/modo=match/);
    await page.locator('#btn-match-start').click();
    await expect(page.locator('#match-card img')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});

test.describe('match por link', () => {
  test('convidar, responder e devolver o resultado', async ({ page }) => {
    const link = await inviteAs(page, 'Ana', t => ['Filme Um', 'Filme Dois'].includes(t));
    expect(link).toContain('?match=');

    // Segunda pessoa: sem conta, sem tela de entrada nem boas-vindas
    await freshVisitor(page);
    await page.addInitScript(() => localStorage.removeItem('has_visited'));
    await page.goto(link);
    await expect(page.locator('#login-overlay')).toBeHidden();
    await expect(page.locator('#onboarding-overlay')).toBeHidden();
    await expect(page.locator('#match-joined-from')).toHaveText('Ana');
    await page.locator('#match-joined-name').fill('Bia');
    await page.locator('[data-action="matchJoin"]').click();
    await expect(page.locator('#match-player')).toHaveText('Bia');
    await voteAll(page, t => ['Filme Dois', 'Filme Três'].includes(t));

    await expect(page.locator('#match-result-title')).toHaveText('Deu match!');
    await expect(page.locator('.match-result-item')).toHaveText(['Filme Dois']);
    const answer = await page.locator('#match-answer-link').inputValue();

    // Volta para a primeira pessoa: resultado pronto
    await page.goto(answer);
    await expect(page.locator('#match-result-title')).toHaveText('Deu match!');
    await expect(page.locator('.match-result-item')).toHaveText(['Filme Dois']);
    await expect(page.locator('#match-answer')).toBeHidden();
  });

  test('o tipo do convite vale para quem recebe', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#btn-tv').click();
    await page.locator('#tab-mode-match').click();
    await page.locator('#btn-match-invite').click();
    await voteAll(page, () => true);
    const link = await page.locator('#match-link').inputValue();

    await freshVisitor(page);
    await page.goto(link);
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'tv');
  });

  test('link inválido avisa e não quebra', async ({ page }) => {
    await page.goto('/?match=lixo');
    await expect(page.locator('#toast')).toHaveText(/não é válido/);
    await expect(page.locator('#match-setup')).toBeVisible();
  });

  test('copiar o convite e abrir o email', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const link = await inviteAs(page, 'Ana', () => true);
    await page.locator('#btn-match-send').click();
    await expect(page.locator('#toast')).toHaveText(/copiado/);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Ana quer decidir');
    expect(copied).toContain(link);

    // Captura o link de email sem abrir o programa de verdade
    await page.evaluate(() => {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="mailto:"]');
        if (!link) return;
        e.preventDefault();
        window.__mailto = link.href;
      }, true);
    });
    await page.locator('#match-email').fill('bia@exemplo.com');
    await page.locator('[data-action="matchEmailInvite"]').click();

    const mailto = new URL(await page.evaluate(() => window.__mailto));
    expect(decodeURIComponent(mailto.pathname)).toBe('bia@exemplo.com');
    expect(mailto.searchParams.get('subject')).toBe('Ana te chamou para um Match');
    expect(mailto.searchParams.get('body')).toContain(link);
  });

  test('nome com HTML aparece como texto para quem recebe', async ({ page }) => {
    const link = await inviteAs(page, '<img src=x>', () => true);
    await freshVisitor(page);
    await page.goto(link);
    await expect(page.locator('#match-joined-from')).toHaveText('<img src=x>');
    await expect(page.locator('#match-joined img')).toHaveCount(0);
  });

  test('recomeçar sai do link', async ({ page }) => {
    const link = await inviteAs(page, 'Ana', () => true);
    await freshVisitor(page);
    await page.goto(link);
    await page.locator('[data-action="matchJoin"]').click();
    await voteAll(page, () => true);
    await page.locator('#match-result [data-action="matchRestart"]').click();
    await expect(page).not.toHaveURL(/match=/);
    await expect(page.locator('#match-setup')).toBeVisible();
  });
});

test.describe('compartilhar', () => {
  const share = page => page.locator('#btn-compartilhar');

  test('no computador baixa o ingresso e copia o texto com o link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await enterAsGuest(page);
    await page.locator('#btn-sortear').click();
    await expect(modal(page)).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), share(page).click()]);
    expect(download.suggestedFilename()).toMatch(/^ingresso-filme-[a-z-]+\.png$/);
    await expect(page.locator('#toast')).toHaveText('Ingresso baixado e link copiado!');

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Hoje é dia de: Filme');
    expect(copied).toMatch(/titulo=movie-\d+/);
  });

  test('no celular envia imagem, texto e link juntos', async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = query => (query === '(pointer: coarse)' ? { matches: true } : original(query));
      navigator.canShare = () => true;
      navigator.share = async data => { window.__shared = { text: data.text, files: data.files.map(f => [f.name, f.type, f.size > 0]) }; };
    });
    await enterAsGuest(page);
    await page.locator('#btn-sortear').click();
    await expect(modal(page)).toBeVisible();
    await share(page).click();

    await expect.poll(() => page.evaluate(() => window.__shared?.files?.[0]?.[1])).toBe('image/png');
    const shared = await page.evaluate(() => window.__shared);
    expect(shared.text).toMatch(/titulo=movie-\d+/);
    expect(shared.files[0][2]).toBe(true);
  });

  test('cancelar no celular não baixa nem mostra erro', async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = query => (query === '(pointer: coarse)' ? { matches: true } : original(query));
      navigator.canShare = () => true;
      navigator.share = async () => { throw new DOMException('cancelado', 'AbortError'); };
    });
    await enterAsGuest(page);
    await page.locator('#btn-sortear').click();
    await expect(modal(page)).toBeVisible();
    await share(page).click();
    await expect(share(page)).toBeEnabled();
    await expect(page.locator('#toast')).not.toHaveText(/Não foi possível|baixado/);
  });

  test('sem pôster disponível, ainda gera', async ({ page }) => {
    await page.route('**/image.tmdb.org/**', route => route.abort());
    await enterAsGuest(page);
    await page.locator('#btn-sortear').click();
    const [download] = await Promise.all([page.waitForEvent('download'), share(page).click()]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });
});
