import { test, expect, openApp } from './support/app.js';

const BIA = { friendship_id: 'f1', other_id: 'u2', username: 'bia', display_name: 'Bia', status: 'accepted', direction: 'sent' };
const SHARE = { id: 's1', from_name: 'Bia', media_type: 'movie', tmdb_id: 603, title: 'Matrix', poster_path: '/m.jpg' };

const seed = (page, data) => page.addInitScript(value => {
  if (!sessionStorage.getItem('__db')) window.__seed = value;
}, data);

// Algo chega no banco: muda o que as funções devolvem e avisa como o Supabase avisaria
const arrive = (page, change, table) => page.evaluate(([c, t]) => {
  Object.assign(window.__seed, c);
  window.__realtimeEmit('postgres_changes', 'INSERT', t);
}, [change, table]);

test.describe('avisos de Amigos', () => {
  test.use({ logged: true });

  test('indicação nova aparece na hora, com aviso e contador', async ({ page }) => {
    await seed(page, { friends: [BIA] });
    await openApp(page);
    await expect(page.locator('#friends-badge')).toBeHidden();

    await arrive(page, { shares: [SHARE] }, 'title_shares');
    await expect(page.locator('#toast')).toHaveText('Bia te indicou Matrix');
    await expect(page.locator('#friends-badge')).toHaveText('1');
  });

  test('o que já estava lá ao entrar não vira aviso', async ({ page }) => {
    await seed(page, { friends: [BIA], shares: [SHARE] });
    await openApp(page);
    await expect(page.locator('#friends-badge')).toHaveText('1');
    await page.locator('#btn-friends').click();
    await expect(page.locator('#toast')).not.toHaveText(/te indicou/);
  });

  test('pedido de amizade e convite de Match ao vivo chegando juntos viram um aviso só', async ({ page }) => {
    await seed(page, { friends: [BIA] });
    await openApp(page);
    await page.evaluate(() => {
      window.__seed.friends = [...window.__seed.friends, { friendship_id: 'f2', other_id: 'u3', username: 'cau', display_name: 'Cau', status: 'pending', direction: 'received' }];
      window.__seed.invites = [{ id: 'i1', from_name: 'Bia', payload: 'ao-vivo:K7P2QX' }];
      window.__realtimeEmit('postgres_changes', 'INSERT', 'friendships');
      window.__realtimeEmit('postgres_changes', 'INSERT', 'match_invites');
    });
    await expect(page.locator('#toast')).toHaveText('Bia te chamou para um Match ao vivo e mais 1 novidade em Amigos');
  });

  test('sem tempo real, a novidade aparece ao voltar para o app', async ({ page }) => {
    await seed(page, { friends: [BIA] });
    await openApp(page);
    await page.evaluate(share => {
      window.__seed.shares = [share];
      document.dispatchEvent(new Event('visibilitychange')); // a aba voltou a ficar visível
    }, SHARE);
    await expect(page.locator('#toast')).toHaveText('Bia te indicou Matrix');
  });

  test('aviso no aparelho: liga com permissão e avisa com o app em segundo plano', async ({ page }) => {
    await page.addInitScript(() => {
      window.__shown = [];
      class FakeNotification {
        constructor(title, options) { window.__shown.push({ title, body: options.body }); }
        close() {}
      }
      FakeNotification.permission = 'default';
      FakeNotification.requestPermission = async () => { FakeNotification.permission = 'granted'; return 'granted'; };
      window.Notification = FakeNotification;
      if (navigator.serviceWorker) navigator.serviceWorker.getRegistration = async () => undefined;
    });
    await seed(page, { friends: [BIA] });
    await openApp(page);
    await page.locator('#btn-friends').click();
    await page.locator('#friends-notify').check();
    await expect(page.locator('#toast')).toHaveText('Pronto! Avisamos neste aparelho quando chegar algo.');
    await expect(page.locator('#friends-notify')).toBeChecked();

    // Com o app na tela, só o aviso de dentro
    await arrive(page, { shares: [SHARE] }, 'title_shares');
    await expect(page.locator('#toast')).toHaveText('Bia te indicou Matrix');
    expect(await page.evaluate(() => window.__shown)).toEqual([]);

    // Em segundo plano, também no aparelho
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }));
    await arrive(page, { shares: [SHARE, { ...SHARE, id: 's2', title: 'Duna' }] }, 'title_shares');
    await expect.poll(() => page.evaluate(() => window.__shown)).toEqual([{ title: 'O Que Assistir?', body: 'Bia te indicou Duna' }]);
  });

  test('aviso no aparelho: permissão negada explica e desmarca', async ({ page }) => {
    await page.addInitScript(() => {
      window.Notification = class { static permission = 'default'; static requestPermission = async () => 'denied'; };
    });
    await openApp(page);
    await page.locator('#btn-friends').click();
    await page.locator('#friends-notify').click();
    await expect(page.locator('#toast')).toHaveText(/O navegador bloqueou os avisos/);
    await expect(page.locator('#friends-notify')).not.toBeChecked();
  });
});
