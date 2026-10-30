import { test, expect, openApp, modal } from './support/app.js';

test.use({ logged: true });

const openFirstResult = async (page, type = 'movie') => {
  await page.locator(`#btn-${type}`).click();
  await page.locator('#btn-top10').click();
  await page.locator('#results-area .result-item').first().click();
  await expect(modal(page)).toBeVisible();
};

test.describe('biblioteca', () => {
  test('salvar, remover e desfazer', async ({ page }) => {
    await openApp(page);
    await openFirstResult(page);
    await page.locator('#btn-salvar').click();
    await expect(modal(page)).toBeHidden();

    const items = page.locator('#library-content .library-item:visible');
    await expect(items).toHaveCount(1);

    await page.locator('#library-content .remove-btn').first().click({ force: true });
    await expect(items).toHaveCount(0);
    await page.locator('#undo-toast-btn').click();
    await expect(items).toHaveCount(1);
    expect(await page.evaluate(() => window.__db.watchlist.length)).toBe(1);
  });

  test('dorama sorteado aparece no próprio grupo', async ({ page }) => {
    await openApp(page);
    await page.locator('#btn-dorama').click();
    await page.locator('#btn-sortear').click();
    await expect(modal(page)).toBeVisible();
    await page.locator('#btn-salvar').click();
    await expect(page.locator('.library-group-title')).toHaveText('DORAMAS (1)');
  });
});

test.describe('episódios', () => {
  test('série sorteada traz temporadas e marca episódio', async ({ page }) => {
    await openApp(page);
    await page.locator('#btn-tv').click();
    await page.locator('#btn-sortear').click();
    await expect(page.locator('.episode-checkbox')).toHaveCount(3);

    await page.locator('.episode-checkbox').first().check();
    await expect(page.locator('.episodes-season-counter')).toContainText('1/3 assistidos');
    await expect(page.locator('.episode-item').first()).toHaveClass(/is-watched/);
  });
});

test.describe('roleta', () => {
  test('o ponteiro para na fatia do vencedor', async ({ page }) => {
    await openApp(page);
    await page.locator('#tab-mode-roulette').click();
    const names = ['A', 'B', 'C', 'D', 'E'];
    for (const name of names) {
      await page.locator('#roulette-input').fill(name);
      await page.locator('#roulette-input').press('Enter');
    }
    await page.locator('[data-action="girarRoleta"]').click();
    const rotation = await page.evaluate(() => parseFloat(document.getElementById('roulette-wheel').style.transform.match(/-?[\d.]+/)[0]));
    await expect(page.locator('#roulette-winner')).toBeVisible({ timeout: 6000 });

    const winner = (await page.locator('#roulette-winner').textContent()).split(': ')[1];
    const slice = 360 / names.length;
    const atPointer = names[Math.floor((((-rotation % 360) + 360) % 360) / slice)];
    expect(atPointer).toBe(winner);
  });
});

test.describe('roleta: estados', () => {
  const add = async (page, name) => {
    await page.locator('#roulette-input').fill(name);
    await page.locator('#roulette-input').press('Enter');
  };

  test('vazia mostra a roda e explica o que fazer; com 2 itens libera o giro', async ({ page }) => {
    await openApp(page);
    await page.locator('#tab-mode-roulette').click();
    const spin = page.locator('#btn-girar');

    await expect(spin).toBeDisabled();
    await expect(page.locator('#roulette-hint')).toBeVisible();
    await expect(page.locator('#btn-limpar-roleta')).toBeHidden();

    await add(page, 'A');
    await expect(spin).toBeDisabled();
    await expect(page.locator('#btn-limpar-roleta')).toBeVisible();

    await add(page, 'B');
    await expect(spin).toBeEnabled();
    await expect(page.locator('#roulette-hint')).toBeHidden();
  });

  test('não gira de novo durante o giro e fica parada no vencedor', async ({ page }) => {
    await openApp(page);
    await page.locator('#tab-mode-roulette').click();
    await add(page, 'A');
    await add(page, 'B');

    const spin = page.locator('#btn-girar');
    await spin.click();
    await expect(spin).toBeDisabled();
    const transform = () => page.locator('#roulette-wheel').evaluate(e => e.style.transform);
    const stopped = await transform();

    await expect(page.locator('#roulette-winner')).toBeVisible({ timeout: 6000 });
    await expect(spin).toBeEnabled();
    await page.waitForTimeout(2500);
    expect(await transform()).toBe(stopped);

    // Mudar a lista invalida o resultado e a roda volta ao início
    await add(page, 'C');
    await expect(page.locator('#roulette-winner')).toBeHidden();
    expect(await transform()).toBe('rotate(0deg)');
  });
});

test.describe('deletar conta', () => {
  const deleteAccount = async page => {
    await page.locator('.user-pill').click();
    await page.locator('#delete-account-section summary').click();
    await page.locator('[data-action="deletarConta"]').click();
    await page.locator('#confirm-ok').click();
    await page.locator('#confirm-ok').click();
  };

  test('falha do servidor não finge sucesso', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { window.__TEST.failDelete = true; });
    await deleteAccount(page);
    await expect(page.locator('#toast')).toHaveText(/Nada foi apagado/);
    await expect(page.locator('#login-overlay')).toBeHidden();
    await expect(page.locator('#user-display')).toHaveText('Pessoa Teste');
  });

  test('sucesso chama a função e volta para o login', async ({ page }) => {
    await openApp(page);
    await deleteAccount(page);
    await expect(page.locator('#toast')).toHaveText(/deletada com sucesso/);
    await expect(page.locator('#login-overlay')).toBeVisible();
    expect(await page.evaluate(() => window.__functionCalls)).toEqual(['delete-account']);
  });
});

test.describe('importação da versão antiga', () => {
  const plantLegacyData = page => page.addInitScript(() => {
    if (sessionStorage.getItem('__planted')) return;
    sessionStorage.setItem('__planted', '1');
    localStorage.setItem('current_user', 'ana');
    localStorage.setItem('all_users', JSON.stringify({ ana: { password: 'senha-falsa', rouletteWins: 7, history: [{ id: 603, title: 'Matrix', poster: '/m.jpg', type: 'movie' }] } }));
    localStorage.setItem('watchlist_obj', JSON.stringify([{ id: 550, title: 'Clube da Luta', poster: '/c.jpg', type: 'movie' }]));
  });

  test('traz a lista com consentimento e limpa o navegador', async ({ page }) => {
    await plantLegacyData(page);
    await openApp(page);
    await expect(page.locator('#confirm-message')).toContainText('1 em Quero Assistir e 1 em Já Assistidos');
    expect(await page.evaluate(() => localStorage.getItem('all_users'))).not.toContain('senha-falsa');

    await page.locator('#confirm-ok').click();
    await expect(page.locator('#toast')).toContainText('Lista trazida');
    const result = await page.evaluate(() => ({
      list: window.__db.watchlist.map(i => i.title),
      seen: window.__db.watch_history.map(i => i.title),
      wins: window.__db.profiles[0].roulette_wins,
      left: ['all_users', 'current_user', 'watchlist_obj'].filter(k => localStorage.getItem(k)),
    }));
    expect(result).toEqual({ list: ['Clube da Luta'], seen: ['Matrix'], wins: 7, left: [] });
  });

  test('falha no banco mantém os dados e "Agora não" adia', async ({ page }) => {
    await plantLegacyData(page);
    await openApp(page);
    await page.evaluate(() => { window.__TEST.failUpsert = true; });
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#toast')).toHaveText(/Nada foi perdido/);
    expect(await page.evaluate(() => Boolean(localStorage.getItem('watchlist_obj')))).toBe(true);

    await page.reload();
    await expect(page.locator('#modal-confirm')).toBeVisible();
    await page.locator('#confirm-cancel').click();
    await page.reload();
    await expect(page.locator('#user-display')).toHaveText('Pessoa Teste');
    await expect(page.locator('#modal-confirm')).toBeHidden();
    expect(await page.evaluate(() => Boolean(localStorage.getItem('watchlist_obj')))).toBe(true);
  });
});
