import { test, expect, enterAsGuest, openApp } from './support/app.js';

// Título da lista: ícone (o banco guarda o emoji; a tela mostra o ícone Phosphor) + nome
const expectListTitle = async (title, icon, name) => {
  await expect(title.locator(`.list-icon[data-icon="${icon}"]`)).toHaveCount(1);
  await expect(title).toHaveText(name);
};

const TOKEN = '3f2a6c1e-8b7d-4e2f-9a1b-0c3d4e5f6a7b';
const it = (id, title) => ({ id, title, poster: `/${id}.jpg`, type: 'movie' });
const posters = page => page.locator('#library-content .library-item[data-reorder-id]');
const order = page => posters(page).evaluateAll(els => els.map(el => Number(el.dataset.reorderId)));
const guestOrder = page => page.evaluate(() => JSON.parse(localStorage.getItem('guest_lists'))[0].items.map(i => i.id));

const seedGuestList = page => page.addInitScript(({ items }) => {
  if (sessionStorage.getItem('__seeded')) return;
  sessionStorage.setItem('__seeded', '1');
  localStorage.setItem('guest_lists', JSON.stringify([{ id: 'g1', name: 'Sexta', emoji: '🍿', items }]));
}, { items: [it(1, 'Filme Um'), it(2, 'Filme Dois'), it(3, 'Filme Três')] });

const seedAccountList = (page, extra = {}) => page.addInitScript(({ extra }) => {
  if (sessionStorage.getItem('__seeded')) return;
  sessionStorage.setItem('__seeded', '1');
  sessionStorage.setItem('__db', JSON.stringify({
    profiles: [{ id: 'u1', username: 'teste', display_name: 'Pessoa Teste', email: 't@t.dev', roulette_wins: 0 }],
    user_lists: [{ id: 'L1', user_id: 'u1', name: 'Sexta', emoji: '🍿', share_token: null, ...extra }],
    user_list_items: [1, 2, 3].map(id => ({ list_id: 'L1', user_id: 'u1', tmdb_id: id, title: `Filme ${id}`, poster_path: `/${id}.jpg`, media_type: 'movie', position: null })),
  }));
}, { extra });

const openSexta = async page => {
  await page.locator('#tab-listas').click();
  await page.locator('#library-content .list-card', { hasText: 'Sexta' }).click();
};

test.describe('listas: ordem', () => {
  test('convidado: ◀ ▶ pelo teclado e arrastando pela alça; a ordem fica no aparelho', async ({ page }) => {
    await seedGuestList(page);
    await enterAsGuest(page);
    await openSexta(page);
    const toggle = page.getByRole('button', { name: 'Ordenar' });
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Pronto' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Pronto' })).toBeFocused();
    expect(await order(page)).toEqual([1, 2, 3]);
    await expect(page.getByRole('button', { name: 'Mover Filme Um para antes' })).toBeDisabled();

    // Teclado: o foco acompanha o título que andou
    await page.getByRole('button', { name: 'Mover Filme Um para depois' }).focus();
    await page.keyboard.press('Enter');
    expect(await order(page)).toEqual([2, 1, 3]);
    await expect(page.getByRole('button', { name: 'Mover Filme Um para depois' })).toBeFocused();
    await expect(page.locator('#list-order-status')).toHaveText('Filme Um agora é o 2º de 3.');
    await page.keyboard.press('Enter');
    expect(await order(page)).toEqual([2, 3, 1]);
    // Chegou à ponta: o botão "depois" fica desativado e o foco passa para o "antes"
    await expect(page.getByRole('button', { name: 'Mover Filme Um para antes' })).toBeFocused();
    expect(await guestOrder(page)).toEqual([2, 3, 1]);

    // Arrastar a alça do último (Filme Um) até o primeiro
    const handle = posters(page).nth(2).locator('.reorder__handle');
    const target = await posters(page).nth(0).boundingBox();
    const from = await handle.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
    await expect(posters(page).nth(0)).toHaveClass(/is-drop-target/);
    await page.mouse.up();
    expect(await order(page)).toEqual([1, 2, 3]);
    expect(await guestOrder(page)).toEqual([1, 2, 3]);

    await page.getByRole('button', { name: 'Pronto' }).click();
    await expect(page.locator('#library-content .library-item__open')).toHaveCount(3); // volta a abrir os títulos

    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await openSexta(page);
    const names = await page.locator('#library-content .library-item__open').evaluateAll(els => els.map(el => el.getAttribute('aria-label')));
    expect(names).toEqual(['Filme Um', 'Filme Dois', 'Filme Três']);
  });

  test.describe('com conta', () => {
    test.use({ logged: true });

    test('a ordem vai para o banco e volta igual em outro aparelho', async ({ page }) => {
      await seedAccountList(page);
      await openApp(page);
      await openSexta(page);
      await page.getByRole('button', { name: 'Ordenar' }).click();
      await page.getByRole('button', { name: 'Mover Filme 3 para antes' }).click();
      await page.getByRole('button', { name: 'Mover Filme 3 para antes' }).click();
      const positions = () => page.evaluate(() => window.__db.user_list_items.map(i => `${i.tmdb_id}:${i.position}`).sort());
      await expect.poll(positions).toEqual(['1:2', '2:3', '3:1']);

      await page.reload();
      await expect(page.locator('#user-display')).toHaveText('Pessoa Teste');
      await openSexta(page);
      const names = await page.locator('#library-content .library-item__open').evaluateAll(els => els.map(el => el.getAttribute('aria-label')));
      expect(names).toEqual(['Filme 3', 'Filme 1', 'Filme 2']);
    });

    test('se o banco não gravar a ordem, avisa e volta como estava', async ({ page }) => {
      await seedAccountList(page);
      await page.addInitScript(() => { window.__TEST.failReorder = true; });
      await openApp(page);
      await openSexta(page);
      await page.getByRole('button', { name: 'Ordenar' }).click();
      await page.getByRole('button', { name: 'Mover Filme 1 para depois' }).click();
      expect(await order(page)).toEqual([2, 1, 3]);
      await expect(page.locator('#toast')).toContainText('Não foi possível salvar a ordem');
      await expect.poll(() => order(page)).toEqual([1, 2, 3]);
    });
  });
});

test.describe('listas: link público', () => {
  test('convidado não cria link: precisa de conta', async ({ page }) => {
    await seedGuestList(page);
    await enterAsGuest(page);
    await openSexta(page);
    await page.getByRole('button', { name: 'Compartilhar', exact: true }).click();
    await expect(page.locator('#toast')).toContainText('Crie uma conta para compartilhar listas por link.');
  });

  test('quem abre o link sem conta vê a lista na ordem e copia para as próprias listas', async ({ page }) => {
    await page.addInitScript(({ token }) => {
      window.__seed = { sharedLists: { [token]: {
        name: 'Para a Bia', emoji: '❤️', owner: 'Ana', is_mine: false, list_id: null,
        items: [3, 1].map(id => ({ tmdb_id: id, title: `Filme ${id}`, poster_path: `/${id}.jpg`, media_type: 'movie' })),
      } } };
    }, { token: TOKEN });
    await page.goto(`/?lista=${TOKEN}`);
    await expect(page.locator('#modal-shared-list')).toBeHidden(); // a tela de entrada vem antes
    await page.locator('#login-form [data-action="loginAsGuest"]').click();

    const modal = page.locator('#modal-shared-list');
    await expect(modal).toBeVisible();
    await expectListTitle(page.locator('#shared-list-title'), 'heart', 'Para a Bia');
    await expect(page.locator('#shared-list-owner')).toHaveText('Lista de Ana · 2 títulos');
    expect(await modal.locator('.library-item__open').evaluateAll(els => els.map(el => el.getAttribute('aria-label')))).toEqual(['Filme 3', 'Filme 1']);
    expect(new URL(page.url()).searchParams.get('lista')).toBeNull(); // o link não abre de novo ao recarregar

    // Abrir um título por cima da lista e voltar
    await modal.locator('.library-item__open').first().click();
    await expect(page.locator('#modal-resultado')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-resultado')).toBeHidden();
    await expect(modal).toBeVisible();

    await page.getByRole('button', { name: 'Copiar para minhas listas' }).click();
    await expect(modal).toBeHidden();
    await expect(page.locator('#toast')).toContainText('Copiada para as suas listas como "Para a Bia".');
    await expectListTitle(page.locator('#list-view-title'), 'heart', 'Para a Bia');
    await expect(page.locator('#list-view-title')).toBeFocused();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_lists')));
    expect(saved.map(l => `${l.name}:${l.items.map(i => i.id).join(',')}`)).toEqual(['Para a Bia:3,1']);
  });

  test('link desligado ou quebrado avisa, sem abrir nada', async ({ page }) => {
    await page.goto(`/?lista=${TOKEN}`);
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('#toast')).toContainText('Esta lista não está mais compartilhada.');
    await expect(page.locator('#modal-shared-list')).toBeHidden();

    await page.goto('/?lista=nao-e-um-link');
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('#toast')).toContainText('Este link de lista está incompleto.');
  });

  test.describe('com conta', () => {
    test.use({ logged: true });

    test('criar o link avisa o que fica visível, copia o link e dá para parar de compartilhar', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await seedAccountList(page);
      await openApp(page);
      await openSexta(page);

      await page.getByRole('button', { name: 'Compartilhar', exact: true }).click();
      await expect(page.locator('#confirm-message')).toContainText('o seu nome, mesmo sem conta');
      await page.locator('#confirm-cancel').click();
      expect(await page.evaluate(() => window.__db.user_lists[0].share_token)).toBeNull();

      await page.getByRole('button', { name: 'Compartilhar', exact: true }).click();
      await page.locator('#confirm-ok').click();
      await expect(page.locator('#toast')).toContainText('Link copiado');
      const token = await page.evaluate(() => window.__db.user_lists[0].share_token);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`?lista=${token}`);
      await expect(page.locator('#library-content')).toContainText('Compartilhada por link');

      // Compartilhar de novo usa o mesmo link, sem perguntar
      await page.getByRole('button', { name: 'Compartilhar', exact: true }).click();
      await expect(page.locator('#modal-confirm')).toBeHidden();
      expect(await page.evaluate(() => window.__db.user_lists[0].share_token)).toBe(token);

      await page.getByRole('button', { name: 'Parar de compartilhar' }).click();
      await page.locator('#confirm-ok').click();
      await expect(page.locator('#toast')).toContainText('O link desta lista não funciona mais.');
      expect(await page.evaluate(() => window.__db.user_lists[0].share_token)).toBeNull();
      await expect(page.getByRole('button', { name: 'Parar de compartilhar' })).toHaveCount(0);
    });

    test('abrir o próprio link leva direto à lista, para editar', async ({ page }) => {
      await seedAccountList(page, { share_token: TOKEN });
      await page.goto(`/?lista=${TOKEN}`);
      await expectListTitle(page.locator('#list-view-title'), 'popcorn', 'Sexta');
      await expect(page.locator('#modal-shared-list')).toBeHidden();
    });
  });
});
