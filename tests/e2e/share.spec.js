import { test, expect, enterAsGuest, openApp, modal } from './support/app.js';

const BIA = { friendship_id: 'f1', other_id: 'u2', username: 'bia', display_name: 'Bia', status: 'accepted', direction: 'sent' };
const seed = (page, data) => page.addInitScript(value => {
  if (!sessionStorage.getItem('__db')) window.__seed = value;
}, data);

const shareModal = page => page.locator('#modal-share');

const touchScreen = (page, share) => page.addInitScript(fn => {
  const original = window.matchMedia.bind(window);
  window.matchMedia = query => (query === '(pointer: coarse)' ? { matches: true } : original(query));
  navigator.canShare = () => true;
  navigator.share = new Function('data', fn);
}, share);

async function drawTitle(page) {
  await page.locator('#btn-sortear').click();
  await expect(modal(page)).toBeVisible();
}

async function openShare(page) {
  await page.locator('#btn-compartilhar').click();
  await expect(shareModal(page)).toBeVisible();
}

// Plataformas no Brasil para qualquer título, por cima da resposta padrão (vazia)
const withProviders = page => page.route(/\/functions\/v1\/tmdb\/(movie|tv)\/\d+\/watch\/providers/, route => route.fulfill({
  contentType: 'application/json',
  json: { results: { BR: { link: 'https://tmdb.dev', flatrate: [{ provider_name: 'Netflix', logo_path: '/n.jpg' }, { provider_name: 'Max', logo_path: '/m.jpg' }] } } },
}));

test.describe('gerar ingresso', () => {
  test('baixa só a imagem, sem abrir o compartilhar', async ({ page }) => {
    await enterAsGuest(page);
    await drawTitle(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btn-ingresso').click()]);
    expect(download.suggestedFilename()).toMatch(/^ingresso-filme-[a-z-]+\.png$/);
    await expect(page.locator('#toast')).toHaveText('Ingresso baixado!');
    await expect(shareModal(page)).toBeHidden();
  });

  test('pelo teclado, mostra que está gerando e o foco fica no botão', async ({ page }) => {
    // O elenco só chega depois que o teste viu o "Gerando…": um atraso fixo perdia a corrida com a máquina ocupada
    let releaseCredits;
    const creditsHeld = new Promise(resolve => { releaseCredits = resolve; });
    await page.route(/\/credits$/, async route => { await creditsHeld; await route.fallback(); });
    await enterAsGuest(page);
    await drawTitle(page);
    const button = page.locator('#btn-ingresso');
    await button.focus();
    const downloaded = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toContainText('Gerando…');
    releaseCredits();
    await downloaded;
    await expect(button).not.toHaveAttribute('aria-busy');
    await expect(button).toContainText('Gerar ingresso');
    await expect(button).toBeFocused();
  });

  test('sem pôster nem logos disponíveis, ainda gera', async ({ page }) => {
    await page.route('**/image.tmdb.org/**', route => route.abort());
    await withProviders(page);
    await enterAsGuest(page);
    await drawTitle(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btn-ingresso').click()]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test('cor do ingresso segue o tipo: âmbar filme, teal série, rosa dorama', async ({ page }) => {
    await enterAsGuest(page);
    // Selo "Hoje é dia de" e marca do canhoto na cor do tipo: conta os pixels de cada cor
    const counts = await page.evaluate(async () => {
      const { drawTicket } = await import('/src/app/ticket.js');
      const palette = { movie: [255, 201, 77], tv: [61, 214, 198], dorama: [255, 143, 184] };
      const count = async kind => {
        const canvas = await drawTicket({ id: 1, title: 'X' }, { kind });
        const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        const found = Object.fromEntries(Object.keys(palette).map(k => [k, 0]));
        for (let i = 0; i < data.length; i += 4) {
          for (const [k, [r, g, b]] of Object.entries(palette)) {
            if (data[i] === r && data[i + 1] === g && data[i + 2] === b) found[k] += 1;
          }
        }
        return found;
      };
      return { movie: await count('movie'), tv: await count('tv'), dorama: await count('dorama') };
    });
    for (const kind of ['movie', 'tv', 'dorama']) {
      const others = Object.entries(counts[kind]).filter(([k]) => k !== kind).map(([, n]) => n);
      expect(counts[kind][kind]).toBeGreaterThan(5000);
      expect(Math.max(...others)).toBeLessThan(50);
    }
  });

  test('sem pôster: usa a cena do episódio; sem cena, o elenco; e o canvas segue exportável', async ({ page }) => {
    await enterAsGuest(page);
    const requested = [];
    page.on('request', req => { if (req.url().includes('image.tmdb.org')) requested.push(new URL(req.url()).pathname); });
    const draw = opts => page.evaluate(async o => {
      const { drawTicket } = await import('/src/app/ticket.js');
      const canvas = await drawTicket({ id: 1, name: 'Sem Pôster' }, o);
      return canvas.toDataURL('image/png').length;
    }, opts);

    expect(await draw({ kind: 'tv', still: '/cena.jpg', castPhotos: ['/a.jpg', '/b.jpg'] })).toBeGreaterThan(1000);
    expect(requested).toContain('/t/p/w780/cena.jpg');
    expect(requested.some(p => p.startsWith('/t/p/w185/'))).toBe(false); // a cena bastou

    requested.length = 0;
    expect(await draw({ kind: 'movie', castPhotos: ['/a.jpg', '/b.jpg', '/c.jpg'] })).toBeGreaterThan(1000);
    expect(requested).toEqual(expect.arrayContaining(['/t/p/w185/a.jpg', '/t/p/w185/b.jpg', '/t/p/w185/c.jpg']));
  });

  test('série sem imagem nenhuma: o ingresso busca uma cena da 1ª temporada', async ({ page }) => {
    await enterAsGuest(page);
    await page.route(/\/functions\/v1\/tmdb\/tv\/\d+\/season\/1/, route => route.fulfill({
      contentType: 'application/json', json: { episodes: [{ still_path: null }, { still_path: '/ep2.jpg' }] },
    }));
    await page.route(/\/functions\/v1\/tmdb\/tv\/\d+(\?|$)/, route => route.fulfill({
      contentType: 'application/json', json: { id: 9, number_of_seasons: 2 },
    }));
    const extras = await page.evaluate(async () => {
      const { titleExtras } = await import('/src/app/ticket.js');
      return titleExtras({ id: 9, name: 'Sem Imagem' }, 'tv');
    });
    expect(extras).toMatchObject({ still: '/ep2.jpg', length: '2', poster: null, backdrop: null });
  });

  test('canvas continua exportável com pôster e logos', async ({ page }) => {
    await withProviders(page);
    await enterAsGuest(page);
    const size = await page.evaluate(async () => {
      const { drawTicket } = await import('/src/app/ticket.js');
      const canvas = await drawTicket(
        { id: 1, title: 'Filme Um', overview: 'Uma sinopse '.repeat(80), poster_path: '/1.jpg', vote_average: 8 },
        { kind: 'movie', cast: ['A', 'B', 'C', 'D'], providers: [{ name: 'Netflix', logo: '/n.jpg' }] },
      );
      return canvas.toDataURL('image/png').length; // lança erro se alguma imagem contaminou o canvas
    });
    expect(size).toBeGreaterThan(1000);
  });
});

test.describe('compartilhar', () => {
  test('no computador: baixa o ingresso e copia texto completo com o link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await withProviders(page);
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    await expect(page.locator('#share-subtitle')).toHaveText(/· Filme$/);
    await expect(page.locator('#btn-share-apps')).toHaveText('Baixar ingresso e copiar texto');
    await expect(page.locator('#btn-share-whatsapp')).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btn-share-apps').click()]);
    expect(download.suggestedFilename()).toMatch(/^ingresso-filme-[a-z-]+\.png$/);
    await expect(page.locator('#toast')).toHaveText('Ingresso baixado e texto copiado! Cole na conversa.');

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Hoje é dia de: Filme');
    expect(copied).toContain('Filme · 2020 · Nota 8,5');
    expect(copied).toContain('Sinopse de Filme');
    expect(copied).toContain('Elenco: Atriz Teste');
    expect(copied).toContain('Onde assistir: Netflix, Max');
    expect(copied).toMatch(/titulo=movie-\d+/);
  });

  test('WhatsApp no computador copia o ingresso e abre a conversa com o texto e o link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await context.route('https://wa.me/**', route => route.fulfill({ contentType: 'text/html', body: 'ok' }));
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    await expect(page.locator('#share-whatsapp-note')).toContainText('Ctrl+V');
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.locator('#btn-share-whatsapp').click()]);
    await popup.waitForURL(/wa\.me/);
    const text = new URL(popup.url()).searchParams.get('text');
    expect(text).toContain('Hoje é dia de: Filme');
    expect(text).toMatch(/titulo=movie-\d+/);

    await expect(page.locator('#toast')).toHaveText('Ingresso copiado! Na conversa do WhatsApp, cole com Ctrl+V.');
    await page.bringToFront();
    const types = await page.evaluate(async () => (await navigator.clipboard.read()).flatMap(item => item.types));
    expect(types).toContain('image/png');
  });

  test('WhatsApp sem permissão para copiar imagem baixa o ingresso para anexar', async ({ page, context }) => {
    await context.route('https://wa.me/**', route => route.fulfill({ contentType: 'text/html', body: 'ok' }));
    await page.addInitScript(() => { navigator.clipboard.write = async () => { throw new DOMException('negado', 'NotAllowedError'); }; });
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btn-share-whatsapp').click()]);
    expect(download.suggestedFilename()).toMatch(/^ingresso-filme-[a-z-]+\.png$/);
    await expect(page.locator('#toast')).toHaveText('Ingresso baixado. Anexe a imagem na conversa do WhatsApp pelo clipe.');
  });

  test('celular sem o compartilhar do sistema (ex.: fora de HTTPS) baixa o ingresso, sem falar em Ctrl+V', async ({ page, context }) => {
    await context.route('https://wa.me/**', route => route.fulfill({ contentType: 'text/html', body: 'ok' }));
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = query => (query === '(pointer: coarse)' ? { matches: true } : original(query));
      delete Navigator.prototype.canShare;
      delete Navigator.prototype.share;
      window.__copiedImage = false;
      navigator.clipboard.write = async () => { window.__copiedImage = true; };
    });
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    await expect(page.locator('#share-whatsapp-note')).toContainText('pelo clipe');
    await expect(page.locator('#share-whatsapp-note')).not.toContainText('Ctrl+V');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btn-share-whatsapp').click()]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    await expect(page.locator('#toast')).toHaveText('Ingresso baixado. Anexe a imagem na conversa do WhatsApp pelo clipe.');
    expect(await page.evaluate(() => window.__copiedImage)).toBe(false);
  });

  test('no celular envia ingresso, texto e link juntos pelo compartilhar do sistema', async ({ page }) => {
    await touchScreen(page, 'window.__shared = { text: data.text, files: data.files.map(f => [f.name, f.type, f.size > 0]) };');
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    await expect(page.locator('#btn-share-apps')).toHaveText('WhatsApp e outros apps');
    await expect(page.locator('#btn-share-whatsapp')).toBeHidden();
    await page.locator('#btn-share-apps').click();

    await expect.poll(() => page.evaluate(() => window.__shared?.files?.[0]?.[1])).toBe('image/png');
    const shared = await page.evaluate(() => window.__shared);
    expect(shared.text).toContain('Sinopse de Filme');
    expect(shared.text).toMatch(/titulo=movie-\d+/);
    expect(shared.files[0][2]).toBe(true);
  });

  test('cancelar no celular não baixa nem mostra erro', async ({ page }) => {
    await touchScreen(page, "throw new DOMException('cancelado', 'AbortError');");
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    await page.locator('#btn-share-apps').click();
    await expect(page.locator('#btn-share-apps')).toBeEnabled();
    await expect(page.locator('#toast')).not.toHaveText(/Não foi possível|baixado/);
  });

  test('convidado vê o convite para criar conta no lugar dos amigos', async ({ page }) => {
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    await expect(page.locator('#share-friends')).toBeHidden();
    await expect(page.locator('#share-friends-hint')).toHaveText(/Com uma conta/);
  });
});

test.describe('indicar para amigos', () => {
  test.use({ logged: true });

  test('envia o título para o amigo, uma vez só', async ({ page }) => {
    await seed(page, { friends: [BIA] });
    await openApp(page);
    await drawTitle(page);
    await openShare(page);
    const target = page.locator('#share-friends .friend-target', { hasText: 'Bia' });
    await target.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#toast')).toHaveText('Enviado para Bia!');
    await expect(target).toHaveText('Bia ✓');
    await expect(target).toHaveAttribute('aria-disabled', 'true');
    await expect(target).toHaveAttribute('aria-label', 'Enviado para Bia');
    await expect(target).toBeFocused(); // o foco não se perde ao enviar
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.__db.title_shares.length)).toBe(1);
    const sent = await page.evaluate(() => window.__db.title_shares);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ from_user: 'u1', to_user: 'u2', media_type: 'movie' });
    expect(sent[0].poster_path).toMatch(/^\/\d+\.jpg$/);

    // Reabrir e mandar de novo não duplica
    await page.locator('[data-action="closeModal"][data-arg="modal-share"]').click();
    await openShare(page);
    await target.click();
    await expect(page.locator('#toast')).toHaveText('Bia já recebeu este título.');
    expect(await page.evaluate(() => window.__db.title_shares.length)).toBe(1);
  });

  test('sem amigos, explica como enviar pelo app', async ({ page }) => {
    await openApp(page);
    await drawTitle(page);
    await openShare(page);
    await expect(page.locator('#share-friends')).toBeHidden();
    await expect(page.locator('#share-friends-hint')).toHaveText(/Adicione amigos/);
  });

  test('sem a tabela no banco, o resto do compartilhar continua', async ({ page }) => {
    await page.addInitScript(() => { window.__TEST_NO_SHARES = true; });
    await seed(page, { friends: [BIA] });
    await openApp(page);
    await drawTitle(page);
    await openShare(page);
    await expect(page.locator('#share-friends')).toBeHidden();
    await expect(page.locator('#share-friends-hint')).toHaveText('Envio para amigos indisponível no momento.');
    await expect(page.locator('#btn-share-apps')).toBeVisible();
  });

  test('indicação recebida conta na aba, abre o título e sai da caixa', async ({ page }) => {
    await seed(page, {
      friends: [BIA],
      shares: [{ id: 's1', from_name: 'Bia', media_type: 'movie', tmdb_id: 2, title: 'Filme Dois', poster_path: '/2.jpg' }],
    });
    await openApp(page);
    await expect(page.locator('#friends-badge')).toHaveText('1');
    await expect(page.locator('#btn-friends')).toHaveAttribute('aria-label', 'Amigos: 1 indicação');
    await page.locator('#btn-friends').click();
    const item = page.locator('#title-shares li');
    await expect(item).toContainText('Filme Dois');
    await expect(item).toContainText('Indicado por Bia');

    await item.locator('[data-action="friendShareOpen"]').click();
    await expect(page.locator('#m-title')).toHaveText('Filme Dois');
    await expect(page.locator('#friends-badge')).toBeHidden();
    await expect(page.locator('#btn-friends')).toHaveAttribute('aria-label', 'Amigos');
    expect(await page.evaluate(() => window.__db.removed)).toContain('s1');

    // Fechar o título volta para a lista de amigos, com o foco num lugar que existe
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-friends')).toBeVisible();
    await expect(page.locator('#modal-friends [role="dialog"]')).toBeFocused(); // a seção ficou vazia e sumiu
  });

  test('apagar indicação tira da caixa', async ({ page }) => {
    await seed(page, {
      friends: [BIA],
      shares: [{ id: 's1', from_name: 'Bia', media_type: 'tv', tmdb_id: 3, title: '<b>Série</b>', poster_path: null }],
    });
    await openApp(page);
    await page.locator('#btn-friends').click();
    await expect(page.locator('#title-shares li')).toContainText('<b>Série</b>'); // HTML aparece como texto
    await page.locator('[data-action="friendShareDelete"]').click();
    await expect(page.locator('#title-shares').locator('..')).toBeHidden();
    await expect(page.locator('#undo-toast')).toContainText('Indicação de <b>Série</b> apagada.');
    await expect.poll(() => page.evaluate(() => window.__db.removed || []), { timeout: 8000 }).toContain('s1');
  });

  test('apagar indicação pode ser desfeito', async ({ page }) => {
    await seed(page, {
      friends: [BIA],
      shares: [{ id: 's1', from_name: 'Bia', media_type: 'movie', tmdb_id: 2, title: 'Filme Dois', poster_path: '/2.jpg' }],
    });
    await openApp(page);
    await page.locator('#btn-friends').click();
    await page.locator('[data-action="friendShareDelete"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#title-shares li')).toHaveCount(0);
    await expect(page.locator('#friends-badge')).toBeHidden();
    await expect(page.locator('#undo-toast-btn')).toBeFocused(); // removeu pelo teclado: foco vai para Desfazer
    await page.keyboard.press('Enter');
    await expect(page.locator('#title-shares li')).toContainText('Filme Dois');
    await expect(page.locator('#title-shares [data-action="friendShareOpen"]')).toBeFocused();
    await expect(page.locator('#friends-badge')).toHaveText('1');
    expect(await page.evaluate(() => window.__db.removed || [])).not.toContain('s1');
  });
});

test.describe('conquistas sociais', () => {
  test('convidado: compartilhar o ingresso desbloqueia Bilheteiro', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    await Promise.all([page.waitForEvent('download'), page.locator('#btn-share-apps').click()]);
    await expect(page.locator('#achievement-name')).toHaveText('Bilheteiro');
  });

  test('cancelar o compartilhar do celular não conta', async ({ page }) => {
    await touchScreen(page, "throw new DOMException('cancelado', 'AbortError');");
    await enterAsGuest(page);
    await drawTitle(page);
    await openShare(page);
    await page.locator('#btn-share-apps').click();
    await expect(page.locator('#btn-share-apps')).toBeEnabled();
    await expect(page.locator('#achievement')).toBeHidden();
  });

  test.describe('com conta', () => {
    test.use({ logged: true });

    test('ter um amigo desbloqueia Turma, gravada na conta', async ({ page }) => {
      await seed(page, { friends: [BIA] });
      await openApp(page);
      await expect(page.locator('#achievement-name')).toHaveText('Turma');
      const saved = await page.evaluate(() => ({
        badges: window.__db.user_badges.map(b => b.badge_name),
        friends: window.__db.user_metadata.progress.social.friends,
      }));
      expect(saved.badges).toContain('Turma');
      expect(saved.friends).toBe(1);
    });

    test('pedido ainda pendente não conta como amigo', async ({ page }) => {
      await seed(page, { friends: [{ ...BIA, status: 'pending', direction: 'received' }] });
      await openApp(page);
      await expect(page.locator('#friends-badge')).toHaveText('1');
      expect(await page.evaluate(() => window.__db.user_badges.map(b => b.badge_name))).not.toContain('Turma');
    });

    test('indicar um título desbloqueia Indicador', async ({ page }) => {
      await seed(page, { friends: [BIA] });
      await openApp(page);
      await drawTitle(page);
      await openShare(page);
      await page.locator('#share-friends .friend-target', { hasText: 'Bia' }).click();
      await expect(page.locator('#achievement-name')).toHaveText('Indicador');
      expect(await page.evaluate(() => window.__db.user_metadata.progress.social.sharesSent)).toBe(1);
    });

    test('o perfil mostra a categoria Social', async ({ page }) => {
      await openApp(page);
      await page.locator('#user-display').click();
      await expect(page.locator('.badge-category', { hasText: 'Social' })).toBeVisible();
      await expect(page.locator('#badges-container .badge-item')).toHaveCount(26);
      // O estado não depende só da cor
      await expect(page.locator('#badges-container .badge-item:not(.unlocked) h4').first()).toContainText('bloqueada');
    });
  });
});
