import { test, expect, enterAsGuest, modal, openApp } from './support/app.js';

// Título da lista: ícone (o banco guarda o emoji; a tela mostra o ícone Phosphor) + nome
const expectListTitle = async (title, icon, name) => {
  await expect(title.locator(`.list-icon[data-icon="${icon}"]`)).toHaveCount(1);
  await expect(title).toHaveText(name);
};

const saveModal = page => page.locator('#modal-save-list');
const editModal = page => page.locator('#modal-list-edit');
const option = (page, name) => saveModal(page).locator('label', { hasText: name }).locator('input');

const openTitle = async (page, index = 0) => {
  await page.locator('#btn-top10').click();
  await page.locator('#results-area .result-item').nth(index).click();
  await expect(modal(page)).toBeVisible();
};

// Esc fecha só a janela do topo: primeiro "Salvar em lista", depois o título
const closeBoth = async page => {
  await page.keyboard.press('Escape');
  await expect(saveModal(page)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(modal(page)).toBeHidden();
};

// Pela janela "Salvar em lista": cria a lista e já guarda o título aberto nela
const createFromTitle = async (page, name, icone) => {
  await saveModal(page).getByRole('button', { name: '+ Nova lista' }).click();
  await expect(editModal(page)).toBeVisible();
  await expect(page.locator('#list-name')).toBeFocused();
  await page.locator('#list-name').fill(name);
  if (icone) await editModal(page).getByRole('radio', { name: icone }).click();
  await editModal(page).getByRole('button', { name: 'Criar e salvar' }).click();
  await expect(editModal(page)).toBeHidden();
};

test.describe('listas personalizadas', () => {
  test('convidado: cria listas pelo título, guarda em várias e elas ficam no aparelho', async ({ page }) => {
    await enterAsGuest(page);
    await openTitle(page);
    await expect(page.locator('#btn-salvar-lista')).toHaveText('Salvar em uma lista');

    await page.locator('#btn-salvar-lista').click();
    await expect(saveModal(page)).toBeVisible();
    await expect(page.locator('#save-list-subtitle')).toHaveText('Onde guardar "Filme Um"? Pode marcar mais de uma.');
    await expect(page.locator('#save-list-empty')).toBeVisible();

    await createFromTitle(page, '  Maratona   Halloween ', 'Caveira');
    await expect(option(page, 'Maratona Halloween')).toBeChecked();
    await expect(page.locator('#save-list-empty')).toBeHidden();
    // O foco volta para o botão que abriu a janela de criar
    await expect(saveModal(page).getByRole('button', { name: '+ Nova lista' })).toBeFocused();

    await createFromTitle(page, 'Sexta à noite');
    await expect(option(page, 'Sexta à noite')).toBeChecked();
    await option(page, 'Maratona Halloween').uncheck();
    await expect(page.locator('#save-list-status')).toHaveText('Tirado de Maratona Halloween.');
    await option(page, 'Maratona Halloween').check();
    await saveModal(page).getByRole('button', { name: 'Pronto' }).click();
    await expect(page.locator('#btn-salvar-lista')).toHaveText('Em 2 listas');

    // Entrar numa lista não mexe em "Quero Assistir"
    await page.keyboard.press('Escape');
    await expect(modal(page)).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('guest_watchlist'))).toBeNull();

    // Outro título só na "Sexta à noite"
    await openTitle(page, 1);
    await page.locator('#btn-salvar-lista').click();
    await option(page, 'Sexta à noite').check();
    await expect(saveModal(page).locator('label', { hasText: 'Sexta à noite' })).toContainText('2 títulos');
    await closeBoth(page);

    await page.locator('#tab-listas').click();
    const cards = page.locator('#library-content .list-card:not(.list-card--collection)');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText('Maratona Halloween');
    await expect(cards.nth(0)).toContainText('1 título');
    await expect(cards.nth(1)).toContainText('2 títulos');

    await page.reload();
    await page.locator('#login-form [data-action="loginAsGuest"]').click();
    await expect(page.locator('#tab-listas')).toHaveAttribute('aria-selected', 'true'); // a aba é lembrada
    await cards.filter({ hasText: 'Sexta à noite' }).click();
    await expect(page.locator('#list-view-title')).toBeFocused();
    await expectListTitle(page.locator('#list-view-title'), 'film-slate', 'Sexta à noite');
    await expect(page.locator('#library-content .library-item__open')).toHaveCount(2);

    // Tirar da lista, com desfazer
    await page.getByRole('button', { name: 'Tirar Filme Dois da lista' }).click();
    await expect(page.locator('#library-content .library-item__open')).toHaveCount(1);
    await page.locator('#undo-toast-btn').click();
    await expect(page.locator('#library-content .library-item__open')).toHaveCount(2);
    await page.getByRole('button', { name: 'Tirar Filme Dois da lista' }).click();
    await page.locator('#library-content .library-item__open').first().focus(); // o tempo do desfazer corre
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('guest_lists'))[1].items.map(i => i.title)), { timeout: 10000 })
      .toEqual(['Filme Um']);

    await page.getByRole('button', { name: 'Todas as listas' }).click();
    await expect(cards.filter({ hasText: 'Sexta à noite' })).toBeFocused();
  });

  test('nome vazio ou repetido não passa; renomear e apagar a lista', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#tab-listas').click();
    await expect(page.locator('#library-content')).toContainText('Nenhuma lista ainda');

    await page.locator('#library-content').getByRole('button', { name: '+ Criar a minha' }).click();
    await editModal(page).getByRole('button', { name: 'Criar lista' }).click();
    await expect(page.locator('#list-name-error')).toHaveText('Dê um nome para a lista.');
    await expect(page.locator('#list-name')).toHaveAttribute('aria-invalid', 'true');
    await page.locator('#list-name').fill('Terror');
    // Escolher o ícone pelas setas
    await editModal(page).getByRole('radio', { name: 'Claquete' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(editModal(page).getByRole('radio', { name: 'Pipoca' })).toHaveAttribute('aria-checked', 'true');
    await page.locator('#list-name').press('Enter');
    await expect(editModal(page)).toBeHidden();
    await expect(page.locator('#library-content .list-card:not(.list-card--collection)')).toBeFocused();
    await expect(page.locator('#library-content .list-card:not(.list-card--collection) .list-icon[data-icon="popcorn"]')).toHaveCount(1);

    await page.locator('#library-content').getByRole('button', { name: '+ Nova lista' }).click();
    await page.locator('#list-name').fill('TERROR');
    await page.locator('#list-name').press('Enter');
    await expect(page.locator('#list-name-error')).toHaveText('Você já tem uma lista com esse nome.');
    await page.keyboard.press('Escape');

    await page.locator('#library-content .list-card:not(.list-card--collection)').click();
    await page.getByRole('button', { name: 'Renomear' }).click();
    await expect(page.locator('#list-edit-title')).toHaveText('Renomear lista');
    await expect(page.locator('#list-name')).toHaveValue('Terror');
    await page.locator('#list-name').fill('Terror dos anos 80');
    await editModal(page).getByRole('radio', { name: 'Fantasma' }).click();
    await editModal(page).getByRole('button', { name: 'Salvar' }).click();
    await expectListTitle(page.locator('#list-view-title'), 'ghost', 'Terror dos anos 80');
    await expect(page.locator('#list-view-title')).toBeFocused();

    await page.getByRole('button', { name: 'Apagar lista' }).click();
    await expect(page.locator('#confirm-title')).toHaveText('Apagar "Terror dos anos 80"?');
    await page.locator('#confirm-cancel').click();
    await expect(page.locator('#list-view-title')).toBeVisible();
    await page.getByRole('button', { name: 'Apagar lista' }).click();
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#library-content')).toContainText('Nenhuma lista ainda');
    expect(await page.evaluate(() => localStorage.getItem('guest_lists'))).toBe('[]');
  });

  test('modelos: um toque cria a lista; na janela "Nova lista", preenche nome e ícone', async ({ page }) => {
    await enterAsGuest(page);
    await page.locator('#tab-listas').click();
    await page.locator('#library-content').getByRole('button', { name: 'Favoritos' }).click();
    await expect(page.locator('#toast')).toContainText('Lista "Favoritos" criada.');
    const mine = page.locator('#library-content .list-card:not(.list-card--collection)');
    await expect(mine.locator('.list-icon[data-icon="trophy"]')).toHaveCount(1);
    await expect(mine).toBeFocused();

    await page.locator('#library-content').getByRole('button', { name: '+ Nova lista' }).click();
    const templates = page.locator('#list-templates');
    await expect(templates.getByRole('button', { name: 'Favoritos' })).toHaveCount(0); // já existe
    await templates.getByRole('button', { name: 'Com o mozão' }).click();
    await expect(page.locator('#list-name')).toHaveValue('Com o mozão');
    await expect(editModal(page).getByRole('radio', { name: 'Coração' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#list-edit-save')).toBeFocused();
    await page.locator('#list-edit-save').click();
    await expect(mine).toHaveCount(2);

    // Renomear não mostra modelos
    await mine.first().click();
    await page.getByRole('button', { name: 'Renomear' }).click();
    await expect(templates.locator('button')).toHaveCount(0);
  });

  test('coleção pronta: abre, mostra os títulos e copia para as listas; copiar de novo não repete', async ({ page, tmdbUrls }) => {
    await enterAsGuest(page);
    await page.locator('#tab-listas').click();
    await page.locator('#library-content .list-card--collection', { hasText: 'Clássicos do terror' }).click();
    await expectListTitle(page.locator('#list-view-title'), 'skull', 'Clássicos do terror');
    await expect(page.locator('#list-view-title')).toBeFocused();
    await expect(page.locator('#library-content .library-item__open')).toHaveCount(5);
    await expect(page.locator('#library-content .remove-btn')).toHaveCount(0); // a coleção não é da pessoa
    const url = tmdbUrls.filter(u => u.pathname.endsWith('/discover/movie')).pop();
    expect(url.searchParams.get('with_genres')).toBe('27');
    expect(url.searchParams.get('sort_by')).toBe('vote_average.desc');

    await page.getByRole('button', { name: 'Copiar para minhas listas' }).click();
    await expect(page.locator('#toast')).toContainText('Copiada para as suas listas como "Clássicos do terror".');
    await expect(page.getByRole('button', { name: 'Renomear' })).toBeVisible(); // agora é a lista da pessoa
    await expect(page.locator('#library-content .remove-btn')).toHaveCount(5);

    await page.getByRole('button', { name: 'Todas as listas' }).click();
    await page.locator('#library-content .list-card--collection', { hasText: 'Clássicos do terror' }).click();
    await page.getByRole('button', { name: 'Copiar para minhas listas' }).click();
    await expect(page.locator('#toast')).toContainText('Todos já estavam em "Clássicos do terror".');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_lists')));
    expect(saved.map(l => `${l.emoji} ${l.name} ${l.items.length}`)).toEqual(['🎃 Clássicos do terror 5']);
  });

  test.describe('com conta, coleção', () => {
    test.use({ logged: true });

    test('copiar uma coleção grava a lista e os títulos no banco', async ({ page }) => {
      await openApp(page);
      await page.locator('#tab-listas').click();
      await page.locator('#library-content .list-card--collection', { hasText: 'Doramas queridinhos' }).click();
      await page.getByRole('button', { name: 'Copiar para minhas listas' }).click();
      await expect(page.locator('#toast')).toContainText('Copiada para as suas listas');
      const db = await page.evaluate(() => ({
        lists: window.__db.user_lists.map(l => `${l.emoji} ${l.name}`),
        types: [...new Set(window.__db.user_list_items.map(i => i.media_type))],
        count: window.__db.user_list_items.length,
      }));
      expect(db).toEqual({ lists: ['❤️ Doramas queridinhos'], types: ['dorama'], count: 5 });
    });
  });

  test.describe('com conta', () => {
    test.use({ logged: true });

    test('as listas e os títulos vão para o banco, e apagar a lista leva os títulos', async ({ page }) => {
      await openApp(page);
      await openTitle(page);
      await page.locator('#btn-salvar-lista').click();
      await createFromTitle(page, 'Com a família', 'Balão');
      await expect(option(page, 'Com a família')).toBeChecked();
      const db = () => page.evaluate(() => ({
        lists: window.__db.user_lists.map(l => `${l.emoji} ${l.name}`),
        items: window.__db.user_list_items.map(i => `${i.title}/${i.media_type}/${i.poster_path}`),
      }));
      await expect.poll(db).toEqual({ lists: ['🧸 Com a família'], items: ['Filme Um/movie//1.jpg'] });

      await option(page, 'Com a família').uncheck();
      await expect.poll(db).toEqual({ lists: ['🧸 Com a família'], items: [] });
      await option(page, 'Com a família').check();
      await closeBoth(page);

      // Outro aparelho: vem do banco
      await page.goto('/');
      await expect(page.locator('#user-display')).toHaveText('Pessoa Teste');
      await page.locator('#tab-listas').click();
      await expect(page.locator('#library-content .list-card:not(.list-card--collection)')).toContainText('1 título');
      await page.locator('#library-content .list-card:not(.list-card--collection)').click();
      await page.getByRole('button', { name: 'Apagar lista' }).click();
      await page.locator('#confirm-ok').click();
      await expect.poll(db).toEqual({ lists: [], items: [] });
    });

    test('se o banco não tiver as listas, a aba avisa e o título não quebra', async ({ page }) => {
      await page.addInitScript(() => { window.__TEST.failListsRead = true; });
      await openApp(page);
      await page.locator('#tab-listas').click();
      await expect(page.locator('#library-content')).toContainText('Não foi possível carregar suas listas agora.');
      await openTitle(page);
      await page.locator('#btn-salvar-lista').click();
      await expect(page.locator('#toast')).toContainText('As listas não estão disponíveis agora.');
      await expect(saveModal(page)).toBeHidden();
    });

    test('listas do convidado vão para a conta; a de mesmo nome recebe os títulos', async ({ page }) => {
      await page.addInitScript(() => {
        if (sessionStorage.getItem('__seeded')) return;
        sessionStorage.setItem('__seeded', '1');
        sessionStorage.setItem('__db', JSON.stringify({
          profiles: [{ id: 'u1', username: 'teste', display_name: 'Pessoa Teste', email: 't@t.dev', roulette_wins: 0 }],
          user_lists: [{ id: 'L1', user_id: 'u1', name: 'Terror', emoji: '👻' }],
          user_list_items: [{ list_id: 'L1', user_id: 'u1', tmdb_id: 3, title: 'Filme Três', poster_path: '/3.jpg', media_type: 'movie' }],
        }));
        localStorage.setItem('guest_lists', JSON.stringify([
          { id: 'g1', name: 'terror', emoji: '🎃', items: [{ id: 3, title: 'Filme Três', poster: '/3.jpg', type: 'movie' }, { id: 4, title: 'Filme Quatro', poster: '/4.jpg', type: 'movie' }] },
          { id: 'g2', name: 'Natal', emoji: '🎄', items: [{ id: 5, title: 'Filme Cinco', poster: '/5.jpg', type: 'movie' }] },
        ]));
      });
      await page.goto('/');
      await expect(page.locator('#confirm-message')).toContainText('2 listas suas');
      await page.locator('#confirm-ok').click();
      await expect(page.locator('#toast')).toContainText('Lista trazida');
      const result = await page.evaluate(() => ({
        lists: window.__db.user_lists.map(l => `${l.emoji} ${l.name}`),
        items: window.__db.user_list_items.map(i => `${i.list_id === 'L1' ? 'Terror' : 'outra'}:${i.title}`).sort(),
        left: localStorage.getItem('guest_lists'),
      }));
      expect(result).toEqual({
        lists: ['👻 Terror', '🎄 Natal'],
        items: ['Terror:Filme Quatro', 'Terror:Filme Três', 'outra:Filme Cinco'],
        left: null,
      });
      await page.locator('#tab-listas').click();
      await expect(page.locator('#library-content .list-card:not(.list-card--collection)')).toHaveCount(2);
    });
  });
});
