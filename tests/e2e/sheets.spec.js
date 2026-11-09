// Etapa 5a do redesign: no celular as janelas viram gavetas (sobem de baixo, fecham puxando para baixo)
import { test, expect, enterAsGuest, modal, showTop10 } from './support/app.js';

const phone = { width: 390, height: 844 };
const friends = page => page.locator('#modal-friends');
const friendsSheet = page => page.locator('#modal-friends .modal-content');

async function openFriends(page) {
  await page.locator('#btn-friends').click();
  await expect(friends(page)).toBeVisible();
  // espera a gaveta terminar de subir
  await expect.poll(() => friendsSheet(page).evaluate(el => getComputedStyle(el).transform)).toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
}

// Arrasta a alça com o mouse (eventos de ponteiro, como o dedo)
async function dragHandle(page, dy, { steps = 8, holdMs = 0 } = {}) {
  const box = await page.locator('#modal-friends .sheet-handle').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps });
  if (holdMs) await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

test.describe('gavetas no celular', () => {
  test.use({ viewport: phone });

  test('a janela encosta embaixo, com cantos de cima arredondados e a alça', async ({ page }) => {
    await enterAsGuest(page);
    await openFriends(page);
    const box = await friendsSheet(page).boundingBox();
    expect(Math.round(box.y + box.height)).toBe(phone.height);
    expect(Math.round(box.width)).toBe(phone.width);
    await expect(friendsSheet(page)).toHaveCSS('border-top-left-radius', '20px');
    await expect(friendsSheet(page)).toHaveCSS('border-bottom-left-radius', '0px');
    await expect(page.locator('#modal-friends .sheet-handle')).toBeVisible();
  });

  test('puxar pouco e segurar: a gaveta volta; puxar bastante: fecha', async ({ page }) => {
    await enterAsGuest(page);
    await openFriends(page);
    await dragHandle(page, 40, { holdMs: 200 });
    await expect(friends(page)).toBeVisible();
    await expect.poll(() => friendsSheet(page).evaluate(el => el.style.transform)).toBe('');

    const { height } = await friendsSheet(page).boundingBox();
    await dragHandle(page, Math.round(height * 0.5), { holdMs: 200 });
    await expect(friends(page)).toBeHidden();
  });

  test('um peteleco curto e rápido também fecha', async ({ page }) => {
    await enterAsGuest(page);
    await openFriends(page);
    await dragHandle(page, 60, { steps: 2 });
    await expect(friends(page)).toBeHidden();
  });

  test('durante o arraste a gaveta acompanha o dedo e o fundo clareia junto', async ({ page }) => {
    await enterAsGuest(page);
    await openFriends(page);
    const box = await page.locator('#modal-friends .sheet-handle').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 100, { steps: 5 });
    expect(await friendsSheet(page).evaluate(el => el.style.transform)).toBe('translateY(100px)');
    const alpha = await friends(page).evaluate(el => Number(getComputedStyle(el).backgroundColor.match(/[\d.]+\)$/)[0].slice(0, -1)));
    expect(alpha).toBeLessThan(0.95);
    // Para cima: só um pouco (resistência)
    await page.mouse.move(x, y - 100, { steps: 5 });
    expect(await friendsSheet(page).evaluate(el => el.style.transform)).toBe('translateY(-15px)');
    await page.mouse.up();
    await expect(friends(page)).toBeVisible();
  });

  test('Esc e "Fechar" também fecham', async ({ page }) => {
    await enterAsGuest(page);
    await openFriends(page);
    await page.keyboard.press('Escape');
    await expect(friends(page)).toBeHidden();

    await openFriends(page);
    await page.locator('[data-action="closeModal"][data-arg="modal-friends"]').click();
    await expect(friends(page)).toBeHidden();
  });

  test('a página do título vira gaveta e as abas continuam grudando no alto', async ({ page }) => {
    await enterAsGuest(page);
    await showTop10(page);
    await page.locator('#results-area .result-item').first().click();
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#modal-resultado .sheet-handle')).toBeVisible();
    // Os dados do teste são curtos: alonga a página para haver rolagem depois das abas, como com dados reais
    await page.locator('#modal-resultado .modal-body').evaluate(el => el.insertAdjacentHTML('beforeend', '<div style="height:1200px"></div>'));
    await page.locator('#modal-resultado').evaluate(el => el.scrollTo(0, 1200));
    await expect.poll(async () => Math.round((await page.locator('.title-tabs').boundingBox()).y)).toBe(0);
    await page.locator('[data-action="fecharModal"]').click();
    await expect(modal(page)).toBeHidden();
  });
});

test('no computador continua janela no centro, sem alça', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await enterAsGuest(page);
  await openFriends(page);
  await expect(page.locator('#modal-friends .sheet-handle')).toBeHidden();
  const box = await friendsSheet(page).boundingBox();
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(friends(page)).toBeHidden();
});
