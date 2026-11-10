import { test, expect, enterAsGuest, modal, openApp, LIST } from './support/app.js';

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
  test('filtros estreitos: a página sorteada vem vazia e o Match usa a primeira, como o sorteio', async ({ page }) => {
    await page.route(/\/discover\//, route => {
      const pageNumber = new URL(route.request().url()).searchParams.get('page');
      return pageNumber === '1' ? route.fallback() : route.fulfill({ json: { results: [] } });
    });
    await page.addInitScript(() => { Math.random = () => 0.99; }); // a página sorteada nunca é a 1
    await start(page);
    await expect(page.locator('#match-counter')).toHaveText(`1 de ${LIST.length}`);
  });

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

  test('o primeiro match desbloqueia Par Perfeito, e sem match não', async ({ page }) => {
    await start(page);
    await voteAll(page, t => t === 'Filme Um');
    await page.locator('#btn-match-continue').click();
    await voteAll(page, t => t === 'Filme Um');
    await expect(page.locator('#achievement-name')).toHaveText('Par Perfeito');
    const social = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_progress')).social);
    expect(social.matches).toBe(1);
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
    await page.locator('#nav-match').click(); // no celular, pela barra de baixo
    await expect(page.locator('#nav-match')).toHaveAttribute('aria-current', 'page');
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

test.describe('lista do Match', () => {
  async function playLocal(page, wanted) {
    await start(page);
    await voteAll(page, wanted);
    await page.locator('#btn-match-continue').click();
    await voteAll(page, wanted);
    await expect(page.locator('#match-result')).toBeVisible();
    await page.locator('#match-result [data-action="matchRestart"]').click();
  }

  test('guarda o que deu match, com quem, e abre o título', async ({ page }) => {
    await playLocal(page, t => ['Filme Um', 'Filme Dois'].includes(t));
    const history = page.locator('#match-history');
    await expect(history).toBeVisible();
    await expect(history.locator('.match-history__meta')).toHaveText(/^Com Ana e Bia · \d{1,2} de \w+/);
    await expect(history.locator('.match-history__title')).toHaveCount(2);
    await history.locator('.match-history__title', { hasText: 'Filme Dois' }).click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#m-title')).toHaveText('Filme Dois');
  });

  test('sem match, nada entra na lista', async ({ page }) => {
    await start(page);
    await voteAll(page, t => t === 'Filme Um');
    await page.locator('#btn-match-continue').click();
    await voteAll(page, t => t === 'Filme Dois');
    await page.locator('#match-result [data-action="matchRestart"]').click();
    await expect(page.locator('#match-history')).toBeHidden();
  });

  test('salva todos em Quero Assistir, sem repetir', async ({ page }) => {
    await playLocal(page, t => ['Filme Um', 'Filme Dois'].includes(t));
    await page.locator('[data-action="matchHistorySave"]').click();
    await expect(page.locator('#toast')).toHaveText('2 títulos salvos em Quero Assistir');
    await page.locator('[data-action="matchHistorySave"]').click();
    await expect(page.locator('#toast')).toHaveText('Esses títulos já estão em Quero Assistir.');
  });

  test('apagar tem desfazer', async ({ page }) => {
    await playLocal(page, t => t === 'Filme Um');
    await page.locator('[data-action="matchHistoryRemove"]').click();
    await expect(page.locator('#match-history')).toBeHidden();
    await page.locator('#undo-toast-btn').click();
    await expect(page.locator('#match-history .match-history__title')).toHaveText(['Filme Um']);
  });

  test('a lista continua depois de recarregar', async ({ page }) => {
    await playLocal(page, t => t === 'Filme Três');
    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click(); // convidado entra de novo; a lista fica no aparelho
    await page.locator('#tab-mode-match').click();
    await expect(page.locator('#match-history .match-history__title')).toHaveText(['Filme Três']);
  });
});

test.describe('lista do Match com conta', () => {
  test.use({ logged: true });

  test('grava nos dados da conta, não no aparelho', async ({ page }) => {
    await openApp(page);
    await page.locator('#tab-mode-match').click();
    await page.locator('#btn-match-start').click();
    await voteAll(page, t => t === 'Filme Um');
    await page.locator('#btn-match-continue').click();
    await voteAll(page, t => t === 'Filme Um');
    await expect(page.locator('#match-result')).toBeVisible();
    const saved = await page.evaluate(() => ({
      account: window.__db.user_metadata.matchHistory,
      device: localStorage.getItem('guest_match_history'),
    }));
    expect(saved.account).toHaveLength(1);
    expect(saved.account[0]).toMatchObject({ with: 'Pessoa 1 e Pessoa 2', type: 'movie' });
    expect(saved.device).toBeNull();
  });
});
