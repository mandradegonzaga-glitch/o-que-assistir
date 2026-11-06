import { test, expect, enterAsGuest, LIST } from './support/app.js';

// Vota em todos os títulos, dizendo sim só para os que `wanted` aceitar
async function voteAll(page, wanted) {
  for (let i = 0; i < LIST.length; i++) {
    await expect(page.locator('#match-counter')).toHaveText(`${i + 1} de ${LIST.length}`);
    const title = await page.locator('.match-card__title').textContent();
    await page.locator(wanted(title) ? '[data-action="matchYes"]' : '[data-action="matchNo"]').click();
  }
}

// Ana cria a sala e devolve o link e o código
async function host(page, name = 'Ana') {
  await enterAsGuest(page);
  await page.locator('#tab-mode-match').click();
  await page.locator('#match-name-1').fill(name);
  await page.locator('#btn-match-live').click();
  await expect(page.locator('#match-live-lobby')).toBeVisible();
  await expect(page.locator('#match-live-status')).toHaveText('Esperando alguém entrar…');
  return {
    link: await page.locator('#match-live-link').inputValue(),
    code: await page.locator('#match-live-code').textContent(),
  };
}

async function join(page, link, name = 'Bia') {
  await page.goto(link);
  await expect(page.locator('#match-live-join')).toBeVisible();
  await page.locator('#match-live-name').fill(name);
  await page.locator('#btn-match-live-join').click();
}

const sentEvents = page => page.evaluate(() => (window.__liveSent || []).map(m => m.event));

test.describe('Match ao vivo', () => {
  test('duas pessoas votam ao mesmo tempo e veem o mesmo resultado', async ({ page, openPage }) => {
    const { link, code } = await host(page);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(link).toContain(`?ao-vivo=${code}`);
    await expect(page.locator('#match-live-code-sr')).toHaveText(`Código ${code.split('').join(' ')}`);

    const bia = await openPage();
    await join(bia, link);

    // As duas começam juntas, cada uma com o próprio nome e vendo até onde a outra chegou
    await expect(page.locator('#toast')).toHaveText('Bia entrou! Podem votar.');
    await expect(page.locator('#match-voting')).toBeVisible();
    await expect(bia.locator('#match-voting')).toBeVisible();
    await expect(page.locator('#match-player')).toHaveText('Ana');
    await expect(bia.locator('#match-player')).toHaveText('Bia');
    await expect(bia.locator('#match-partner')).toHaveText(`Ana está no 1 de ${LIST.length}`);

    await voteAll(page, t => ['Filme Um', 'Filme Dois'].includes(t));
    await expect(page.locator('#match-live-wait-title')).toHaveText('Pronto! Esperando Bia terminar');
    await expect(page.locator('#match-live-wait-title')).toBeFocused();
    await expect(bia.locator('#match-partner')).toHaveText('Ana já terminou');

    // Privacidade: quem terminou primeiro ainda não mandou os votos
    expect(await sentEvents(page)).not.toContain('votes');
    expect(await sentEvents(page)).toContain('done');

    await voteAll(bia, t => ['Filme Dois', 'Filme Três'].includes(t));

    for (const p of [page, bia]) {
      await expect(p.locator('#match-result-title')).toHaveText('Deu match!');
      await expect(p.locator('.match-result-item')).toHaveText(['Filme Dois']);
      await expect(p.locator('#achievement-name')).toHaveText('Par Perfeito');
    }
    // A partida entra na lista com o nome da outra pessoa. (As duas abas dividem o mesmo localStorage
    // e gravam juntas; em dois aparelhos, cada uma tem a sua lista.)
    await page.locator('#match-result [data-action="matchRestart"]').click();
    await expect(page.locator('#match-history .match-history__meta').first()).toHaveText(/^Com (Bia|Ana) ·/);
    await expect(page.locator('#match-history .match-history__title').first()).toHaveText('Filme Dois');
    await bia.close();
  });

  test('entra pelo código digitado, em minúsculas e com traço', async ({ page, openPage }) => {
    const { code } = await host(page);
    const bia = await openPage();
    await enterAsGuest(bia);
    await bia.locator('#tab-mode-match').click();
    await bia.locator('#match-code-input').fill(`${code.slice(0, 3).toLowerCase()}-${code.slice(3)}`);
    await bia.locator('#match-code-input').press('Enter');
    await expect(bia.locator('#match-live-join')).toBeVisible();
    await expect(bia.locator('#match-live-join-code')).toHaveText(code);
    await expect(bia).toHaveURL(new RegExp(`ao-vivo=${code}`));
    await bia.locator('#match-live-name').fill('Bia');
    await bia.locator('#match-live-name').press('Enter');
    await expect(bia.locator('#match-voting')).toBeVisible();
    await expect(page.locator('#match-voting')).toBeVisible();
    await bia.close();
  });

  test('código inválido explica o formato', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#tab-mode-match').click();
    await page.locator('#match-code-input').fill('ABC');
    await page.locator('[data-action="matchCodeJoin"]').click();
    await expect(page.locator('#toast')).toHaveText(/Código inválido/);
    await expect(page.locator('#match-code-input')).toBeFocused();
  });

  test('uma terceira pessoa não entra', async ({ page, openPage }) => {
    const { link } = await host(page);
    const bia = await openPage();
    await join(bia, link);
    await expect(bia.locator('#match-voting')).toBeVisible();

    const cau = await openPage();
    await join(cau, link, 'Cau');
    await expect(cau.locator('#toast')).toHaveText('Este Match já tem duas pessoas. Peça um novo link.');
    await expect(cau.locator('#match-voting')).toBeHidden();
    await expect(page.locator('#match-player')).toHaveText('Ana'); // a partida segue
    await bia.close();
    await cau.close();
  });

  test('quem sai no meio avisa a outra pessoa', async ({ page, openPage }) => {
    const { link } = await host(page);
    const bia = await openPage();
    await join(bia, link);
    await expect(page.locator('#match-voting')).toBeVisible();

    await bia.locator('#match-voting [data-action="matchYes"]').click();
    await expect(page.locator('#match-partner')).toHaveText(`Bia está no 2 de ${LIST.length}`);
    await bia.close();
    await expect(page.locator('#toast')).toHaveText('Bia saiu do Match.');
    await expect(page.locator('#match-partner')).toHaveText('Bia saiu do Match.');
  });

  test('cancelar a sala volta ao início e tira o código do endereço', async ({ page }) => {
    await host(page);
    await page.locator('#match-live-lobby [data-action="matchRestart"]').click();
    await expect(page.locator('#match-setup')).toBeVisible();
    await expect(page).not.toHaveURL(/ao-vivo=/);
  });

  test('sem conexão em tempo real, avisa e oferece o convite por link', async ({ page }) => {
    await page.addInitScript(() => { window.__TEST_NO_REALTIME = true; });
    await enterAsGuest(page);
    await page.locator('#tab-mode-match').click();
    await page.locator('#btn-match-live').click();
    await expect(page.locator('#toast')).toHaveText(/Não foi possível abrir o Match ao vivo.*convite por link/);
    await expect(page.locator('#match-setup')).toBeVisible();
  });

  test('sala que não existe: desiste depois de um tempo, sem travar', async ({ page }) => {
    await page.clock.install();
    await page.goto('/?ao-vivo=K7P2QX');
    await expect(page.locator('#match-live-join')).toBeVisible();
    await page.locator('#btn-match-live-join').click();
    await expect(page.locator('#match-live-join-status')).toHaveText('Entrando…');
    await page.clock.fastForward(16000);
    await expect(page.locator('#toast')).toHaveText(/Não encontramos esse Match/);
    await expect(page.locator('#btn-match-live-join')).not.toHaveAttribute('aria-disabled');
  });

  test('link ao vivo inválido avisa', async ({ page }) => {
    await page.goto('/?ao-vivo=xx');
    await expect(page.locator('#toast')).toHaveText('Este link de Match ao vivo não é válido. Peça um novo.');
  });
});

test.describe('Match ao vivo com amigos', () => {
  test.use({ logged: true });
  const BIA = { friendship_id: 'f1', other_id: 'u2', username: 'bia', display_name: 'Bia', status: 'accepted', direction: 'sent' };

  test('a sala pode ser enviada para um amigo', async ({ page }) => {
    await page.addInitScript(value => { if (!sessionStorage.getItem('__db')) window.__seed = value; }, { friends: [BIA] });
    await page.goto('/');
    await page.locator('#tab-mode-match').click();
    await page.locator('#btn-match-live').click();
    // O código aparece depois que a sala abre; ler antes dava "ao-vivo:" vazio
    await expect(page.locator('#match-live-code')).toHaveText(/^[A-Z0-9]{6}$/);
    const code = await page.locator('#match-live-code').textContent();
    await page.locator('#match-live-lobby .friend-target', { hasText: 'Bia' }).click();
    await expect(page.locator('#toast')).toHaveText('Enviado para Bia!');
    const sent = await page.evaluate(() => window.__db.match_invites[0]);
    expect(sent.payload).toBe(`ao-vivo:${code}`);
  });

  test('convite ao vivo na caixa abre a tela de entrar', async ({ page }) => {
    await page.addInitScript(() => {
      window.__seed = { invites: [{ id: 'i1', from_name: 'Bia', payload: 'ao-vivo:K7P2QX' }] };
    });
    await page.goto('/');
    await page.locator('#tab-mode-match').click();
    await expect(page.locator('#match-inbox-list li')).toContainText('Bia · ao vivo');
    await page.locator('[data-action="matchInboxOpen"]').click();
    await expect(page).toHaveURL(/ao-vivo=K7P2QX/);
    await expect(page.locator('#match-live-join')).toBeVisible();
    await expect(page.locator('#match-live-join-code')).toHaveText('K7P2QX');
  });
});

test.describe('Match ao vivo: recarregar a página', () => {
  // Ana cria, Bia entra; as duas começam a votar
  async function startPair(page, openPage) {
    const { link } = await host(page);
    const bia = await openPage();
    await join(bia, link);
    await expect(page.locator('#match-voting')).toBeVisible();
    await expect(bia.locator('#match-voting')).toBeVisible();
    return bia;
  }

  // Vota a partir do cartão atual até o fim
  async function voteRest(p, wanted) {
    while (await p.locator('#match-voting').isVisible()) {
      const counter = await p.locator('#match-counter').textContent();
      const title = await p.locator('.match-card__title').textContent();
      await p.locator(wanted(title) ? '[data-action="matchYes"]' : '[data-action="matchNo"]').click();
      if (counter === `${LIST.length} de ${LIST.length}`) break;
      await expect(p.locator('#match-counter')).not.toHaveText(counter);
    }
  }

  test('quem entrou recarrega no meio e continua do mesmo cartão', async ({ page, openPage }) => {
    const bia = await startPair(page, openPage);
    const first = await bia.locator('.match-card__title').textContent();
    await bia.locator('[data-action="matchYes"]').click();
    await bia.locator('[data-action="matchNo"]').click();
    await expect(bia.locator('#match-counter')).toHaveText(`3 de ${LIST.length}`);

    await bia.reload();
    await expect(bia.locator('#toast')).toHaveText('Match ao vivo retomado.');
    await expect(bia.locator('#match-counter')).toHaveText(`3 de ${LIST.length}`);
    await expect(page.locator('#toast')).toHaveText('Bia voltou!');
    await expect(page.locator('#match-partner')).toHaveText(`Bia está no 3 de ${LIST.length}`);

    await voteAll(page, t => t === first);
    await voteRest(bia, () => false);
    // O voto dado antes de recarregar continua valendo
    for (const p of [page, bia]) await expect(p.locator('.match-result-item')).toHaveText([first]);
    await bia.close();
  });

  test('quem criou recarrega depois de terminar e recebe o resultado', async ({ page, openPage }) => {
    const bia = await startPair(page, openPage);
    await voteAll(page, t => t === 'Filme Três');
    await expect(page.locator('#match-live-wait')).toBeVisible();
    await expect(page).toHaveURL(/ao-vivo=/);

    await page.reload();
    await expect(page.locator('#match-live-wait')).toBeVisible();
    await expect(page.locator('#toast')).toHaveText('Match ao vivo retomado.');

    await voteAll(bia, t => t === 'Filme Três');
    for (const p of [page, bia]) {
      await expect(p.locator('#match-result-title')).toHaveText('Deu match!');
      await expect(p.locator('.match-result-item')).toHaveText(['Filme Três']);
    }
    // Acabou: o código sai do endereço e recarregar não reabre a partida
    await expect(page).not.toHaveURL(/ao-vivo=/);
    await page.reload();
    await expect(page.locator('#match-live-join')).toBeHidden();
    await bia.close();
  });

  test('quem criou recarrega com a sala vazia e a sala continua aberta', async ({ page, openPage }) => {
    const { link, code } = await host(page);
    await page.reload();
    await expect(page.locator('#match-live-lobby')).toBeVisible();
    await expect(page.locator('#match-live-code')).toHaveText(code);
    await expect(page.locator('#match-live-status')).toHaveText('Esperando alguém entrar…');
    const bia = await openPage();
    await join(bia, link);
    await expect(page.locator('#match-voting')).toBeVisible();
    await bia.close();
  });
});
