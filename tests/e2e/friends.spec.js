import { test, expect, openApp, enterAsGuest, LIST } from './support/app.js';

const BIA = { friendship_id: 'f1', other_id: 'u2', username: 'bia', display_name: 'Bia', status: 'accepted', direction: 'sent' };
const seed = (page, data) => page.addInitScript(value => {
  if (!sessionStorage.getItem('__db')) {
    window.__seed = value;
  }
}, data);

const openFriends = page => page.locator('#btn-friends').click();

const voteAll = async page => {
  for (let i = 0; i < LIST.length; i++) await page.locator('[data-action="matchYes"]').click();
};

test.describe('amigos com conta', () => {
  test.use({ logged: true });

  test('pedir amizade por username', async ({ page }) => {
    await seed(page, { users: [{ id: 'u2', username: 'bia', display_name: 'Bia' }] });
    await openApp(page);
    await openFriends(page);
    await expect(page.locator('#my-username')).toHaveText('@teste');

    await page.locator('#friend-username').fill('@BIA');
    await page.locator('[data-action="friendAdd"]').click();
    await expect(page.locator('#toast')).toHaveText('Pedido enviado para Bia');
    await expect(page.locator('#friends-sent')).toContainText('@bia');
    await expect(page.locator('#friend-username')).toHaveValue('');
  });

  test('usuário inexistente explica o que fazer', async ({ page }) => {
    await openApp(page);
    await openFriends(page);
    await page.locator('#friend-username').fill('ninguem');
    await page.locator('[data-action="friendAdd"]').click();
    await expect(page.locator('#toast')).toHaveText(/Nenhuma conta com esse usuário/);
  });

  test('aceitar e recusar pedido recebido', async ({ page }) => {
    await seed(page, { friends: [
      { ...BIA, status: 'pending', direction: 'received' },
      { friendship_id: 'f2', other_id: 'u3', username: 'cau', display_name: null, status: 'pending', direction: 'received' },
    ] });
    await openApp(page);
    await openFriends(page);
    const received = page.locator('#friends-received');
    await expect(received.locator('li')).toHaveCount(2);

    await received.locator('li', { hasText: 'bia' }).locator('[data-action="friendAccept"]').click();
    await expect(page.locator('#friends-list')).toContainText('@bia');

    await received.locator('li', { hasText: 'cau' }).locator('[data-action="friendRemove"]').click();
    await expect(page.locator('[data-friends-group]:has(#friends-received)')).toBeHidden();
  });

  const PROFILE = {
    username: 'bia', display_name: 'Bia', roulette_wins: 2,
    history: [{ tmdb_id: 1, title: 'Filme Um', poster_path: '/1.jpg', media_type: 'movie' }],
    watchlist: [{ tmdb_id: 2, title: 'Filme Dois', poster_path: '/2.jpg', media_type: 'movie' }],
    badges: ['Iniciante'],
  };

  test('o perfil do amigo mostra o que assistiu, a lista e as conquistas', async ({ page }) => {
    await seed(page, { friends: [BIA], profiles: { u2: PROFILE } });
    await openApp(page);
    await openFriends(page);
    await page.locator('[data-action="friendOpen"]').click();

    const modal = page.locator('#modal-friend');
    await expect(modal).toBeVisible();
    await expect(page.locator('#friend-title')).toHaveText('Bia');
    await expect(page.locator('#friend-handle')).toHaveText('@bia');
    await expect(page.locator('#friend-history .friend-title')).toHaveText(['Filme Um']);
    await expect(page.locator('#friend-watchlist .friend-title')).toHaveText(['Filme Dois']);
    await expect(page.locator('#friend-badges h4')).toHaveText(['Iniciante']);
    await expect(page.locator('#friend-common-box')).toBeHidden();
  });

  test('título do amigo abre por cima, e dá para voltar ao perfil', async ({ page }) => {
    await seed(page, { friends: [BIA], profiles: { u2: PROFILE } });
    await openApp(page);
    await openFriends(page);
    await page.locator('[data-action="friendOpen"]').click();
    await page.locator('#friend-history .friend-title').click();
    await expect(page.locator('#m-title')).toHaveText('Filme Um');
    const close = page.locator('#modal-resultado .close-btn');
    await close.scrollIntoViewIfNeeded();
    await close.click();
    await expect(page.locator('#modal-friend')).toBeVisible();
  });

  test('mostra o que os dois querem ver', async ({ page }) => {
    await seed(page, { friends: [BIA], profiles: { u2: PROFILE } });
    await openApp(page);
    await page.locator('#btn-top10').click();
    await page.locator('#results-area .result-item', { hasText: 'Filme Dois' }).click();
    await page.locator('#btn-salvar').click();
    await expect(page.locator('#modal-resultado')).toBeHidden();

    await openFriends(page);
    await page.locator('[data-action="friendOpen"]').click();
    await expect(page.locator('#friend-common .friend-title')).toHaveText(['Filme Dois']);
  });

  test('perfil indisponível avisa, sem abrir tela vazia', async ({ page }) => {
    await seed(page, { friends: [BIA] });
    await openApp(page);
    await openFriends(page);
    await page.locator('[data-action="friendOpen"]').click();
    await expect(page.locator('#toast')).toHaveText(/Não foi possível abrir/);
    await expect(page.locator('#modal-friend')).toBeHidden();
  });

  test('remover amigo pede confirmação', async ({ page }) => {
    await seed(page, { friends: [BIA], profiles: { u2: PROFILE } });
    await openApp(page);
    await openFriends(page);
    await page.locator('[data-action="friendOpen"]').click();
    await page.locator('[data-action="friendUnfriendCurrent"]').click();
    await expect(page.locator('#confirm-message')).toContainText('Bia');
    await page.locator('#confirm-cancel').click();
    await expect(page.locator('#friends-list li')).toHaveCount(1);
    await page.locator('[data-action="friendUnfriendCurrent"]').click();
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#modal-friend')).toBeHidden();
    await expect(page.locator('[data-friends-group]:has(#friends-list)')).toBeHidden();
  });

  test('esconder a atividade grava na conta e pode voltar atrás', async ({ page }) => {
    await openApp(page);
    await openFriends(page);
    const share = page.locator('#friends-share');
    await expect(share).toBeChecked();
    await share.uncheck();
    await expect(page.locator('#toast')).toHaveText(/oculta/);
    await expect.poll(() => page.evaluate(() => window.__db.profiles[0].share_with_friends)).toBe(false);

    await page.reload();
    await openFriends(page);
    await expect(page.locator('#friends-share')).not.toBeChecked();
    await page.locator('#friends-share').check();
    await expect.poll(() => page.evaluate(() => window.__db.profiles[0].share_with_friends)).toBe(true);
  });

  test('amigo que escondeu aparece sem atividade, mas dá para chamar para Match', async ({ page }) => {
    await seed(page, { friends: [BIA], profiles: { u2: { ...PROFILE, private: true, history: [], watchlist: [], badges: [] } } });
    await openApp(page);
    await openFriends(page);
    await page.locator('[data-action="friendOpen"]').click();
    await expect(page.locator('#friend-private')).toBeVisible();
    await expect(page.locator('#friend-activity')).toBeHidden();
    await page.locator('[data-action="friendMatchCurrent"]').click();
    await expect(page.locator('#modal-friend')).toBeHidden();
    await expect(page.locator('#modal-friends')).toBeHidden();
    await expect(page.locator('#view-match')).toBeVisible();
  });

  test('pedidos recebidos aparecem na aba, com contador', async ({ page }) => {
    await seed(page, { friends: [{ ...BIA, status: 'pending', direction: 'received' }] });
    await openApp(page);
    await expect(page.locator('#friends-badge')).toHaveText('1');
    await openFriends(page);
    await page.locator('[data-action="friendAccept"]').click();
    await expect(page.locator('#friends-badge')).toBeHidden();
  });

  test('link de amigo pede confirmação e envia o pedido', async ({ page }) => {
    await seed(page, { users: [{ id: 'u2', username: 'bia', display_name: 'Bia' }] });
    await page.goto('/?amigo=bia');
    await expect(page.locator('#confirm-message')).toContainText('@bia');
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#toast')).toHaveText('Pedido enviado para Bia');
    await expect(page.locator('#friends-sent')).toContainText('@bia');
    await expect(page).not.toHaveURL(/amigo=/);
  });

  test('o próprio link não vira pedido', async ({ page }) => {
    await page.goto('/?amigo=teste');
    await expect(page.locator('#toast')).toHaveText(/seu próprio link/);
    await expect(page.locator('#modal-confirm')).toBeHidden();
  });

  test('convidar copia o link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page);
    await openFriends(page);
    await page.locator('[data-action="friendInvite"]').click();
    await expect(page.locator('#toast')).toHaveText(/copiado/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\?amigo=teste/);
  });

  test('nome com HTML aparece como texto', async ({ page }) => {
    await seed(page, { friends: [{ ...BIA, display_name: '<img src=x onerror=alert(1)>' }] });
    await openApp(page);
    await openFriends(page);
    await expect(page.locator('#friends-list .friend-row__name')).toContainText('<img');
    await expect(page.locator('#friends-list img')).toHaveCount(0);
  });

  test('enviar Match para amigo vai para a caixa de convites', async ({ page }) => {
    await seed(page, { friends: [BIA] });
    await openApp(page);
    await page.locator('#tab-mode-match').click();
    await page.locator('#btn-match-invite').click();
    await voteAll(page);

    await page.locator('#match-invite .friend-target', { hasText: 'Bia' }).click();
    await expect(page.locator('#toast')).toHaveText('Enviado para Bia');
    const sent = await page.evaluate(() => window.__db.match_invites[0]);
    expect(sent).toMatchObject({ from_user: 'u1', to_user: 'u2' });
    expect(sent.payload).toMatch(/^[\w-]+$/);
  });

  test('convite recebido abre o Match e sai da caixa', async ({ page }) => {
    await page.addInitScript(() => {
      const code = btoa(JSON.stringify({ t: 'movie', i: [1, 2, 3], a: 'Bia', x: [0] }));
      window.__seed = { invites: [{ id: 'i1', from_name: 'Bia', payload: code }] };
    });
    await openApp(page);
    await page.locator('#tab-mode-match').click();
    await expect(page.locator('#match-inbox-list li')).toContainText('Bia');
    await page.locator('[data-action="matchInboxOpen"]').click();
    await expect(page.locator('#match-joined-from')).toHaveText('Bia');
  });

  test('sem as tabelas no banco, some sem erro e o link continua', async ({ page }) => {
    await page.addInitScript(() => { window.__TEST_NO_FRIENDS = true; });
    await openApp(page);
    await openFriends(page);
    await expect(page.locator('#friends-unavailable')).toBeVisible();
    await expect(page.locator('#friends-content')).toBeHidden();
    await page.locator('[data-action="closeModal"][data-arg="modal-friends"]').click();
    await page.locator('#tab-mode-match').click();
    await page.locator('#btn-match-invite').click();
    await voteAll(page);
    await expect(page.locator('#match-link')).not.toHaveValue('');
    await expect(page.locator('#match-invite [data-friend-targets]')).toBeHidden();
  });
});

test('convidado é convidado a criar conta', async ({ page }) => {
  await enterAsGuest(page);
  await openFriends(page);
  await expect(page.locator('#friends-guest')).toBeVisible();
  await expect(page.locator('#friends-content')).toBeHidden();
});

test('cabeçalho e barra de baixo cabem no celular', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await enterAsGuest(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  await expect(page.locator('#btn-friends')).toBeInViewport();
  // No celular, a navegação é a barra de baixo: os cinco botões cabem inteiros na tela
  for (const id of ['#nav-discover', '#nav-roulette', '#nav-sortear', '#nav-match', '#nav-library']) {
    await expect(page.locator(id)).toBeInViewport({ ratio: 1 });
  }
  await expect(page.locator('.mode-tabs')).toBeHidden();
});

test.describe('comparar gostos', () => {
  test.use({ logged: true });

  const watched = (id, genres, type = 'movie') => ({ user_id: 'u1', tmdb_id: id, title: `Meu ${id}`, poster_path: `/${id}.jpg`, media_type: type, release_year: '2020', genres, watched_at: new Date(2026, 10, id).toISOString() });
  const theirs = (id, genres, type = 'movie') => ({ tmdb_id: id, title: `Dela ${id}`, poster_path: `/${id}.jpg`, media_type: type, release_year: '2020', genres });

  const setup = (page, mine, friendHistory) => page.addInitScript(([history, profile]) => {
    if (sessionStorage.getItem('__db')) return;
    window.__seed = { friends: [{ friendship_id: 'f1', other_id: 'u2', username: 'bia', display_name: 'Bia', status: 'accepted', direction: 'sent' }], profiles: { u2: profile } };
    sessionStorage.setItem('__db', JSON.stringify({
      profiles: [{ id: 'u1', username: 'teste', display_name: 'Pessoa Teste', email: 't@t.dev', roulette_wins: 0 }],
      watch_history: history, watchlist: [], user_preferences: [], user_badges: [], sorteio_history: [], blacklist: [], episode_progress: [],
    }));
  }, [mine, { username: 'bia', display_name: 'Bia', history: friendHistory, watchlist: [], badges: [] }]);

  const openBia = async page => {
    await openApp(page);
    await openFriends(page);
    await page.locator('[data-action="friendOpen"]').click();
    await expect(page.locator('#modal-friend')).toBeVisible();
  };

  test('mostra a porcentagem, os gêneros em comum e o que os dois já viram', async ({ page }) => {
    // eu: Terror 2/4, Comédia 1/4, Ação 1/4; Bia: Terror, Comédia e Ação 1/5 cada, Drama 2/5 → 20+20+20 = 60%
    await setup(page,
      [watched(1, [27]), watched(2, [27]), watched(3, [35]), watched(4, [28])],
      [theirs(2, [27]), theirs(5, [35]), theirs(6, [18]), theirs(7, [18]), theirs(4, [28], 'tv')]);
    await openBia(page);
    const box = page.locator('#friend-compat');
    await expect(box).toBeVisible();
    await expect(page.locator('#friend-compat-score')).toHaveText('60%');
    await expect(page.locator('#friend-compat-label')).toHaveText('Gostos bem parecidos');
    await expect(page.locator('#friend-compat-text')).toHaveText('Os dois curtem Ação, Comédia e Terror. Bia assiste mais Drama; você, mais Terror.');
    // o 4 dela é série, o meu é filme: não conta como o mesmo título
    await expect(page.locator('#friend-watched .friend-title')).toHaveText(['Dela 2']);
    await expect(page.locator('#friend-compat-note')).toBeHidden();
  });

  test('com poucos títulos explica o que falta', async ({ page }) => {
    await setup(page, [watched(1, [27])], [theirs(2, [27]), theirs(3, [27]), theirs(4, [35])]);
    await openBia(page);
    await expect(page.locator('#friend-compat-result')).toBeHidden();
    await expect(page.locator('#friend-compat-note')).toHaveText('Marque pelo menos 3 títulos como assistidos para ver a compatibilidade com Bia.');
    await expect(page.locator('#friend-watched-box')).toBeHidden();
  });

  test('servidor sem os gêneros esconde a porcentagem, mas mostra os títulos em comum', async ({ page }) => {
    const old = [theirs(1, [27]), theirs(2, [27]), theirs(3, [35])].map(({ genres, ...rest }) => rest);
    await setup(page, [watched(1, [27]), watched(2, [27]), watched(3, [35])], old);
    await openBia(page);
    await expect(page.locator('#friend-compat')).toBeHidden();
    await expect(page.locator('#friend-watched .friend-title')).toHaveText(['Dela 1', 'Dela 2', 'Dela 3']);
  });
});
