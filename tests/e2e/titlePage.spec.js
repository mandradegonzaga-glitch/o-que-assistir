import { test, expect, modal } from './support/app.js';

// Convidado não fica salvo entre aberturas: o link do título abre depois de entrar
const openTitle = async (page, ref) => {
  await page.goto(`/?titulo=${ref}`);
  await page.locator('#login-form [data-action="loginAsGuest"]').click();
};

// Página do título (etapa 2 do redesign): ações em ícones, abas e "Parecidos"
test.describe('página do título', () => {
  test('abas levam até cada parte; "Parecidos" abre outro título', async ({ page }) => {
    await openTitle(page, 'movie-1');
    await expect(page.locator('#m-title')).toHaveText('Filme Um');

    // Ações principais num grupo com nome; o fundo leva o pôster do título
    await expect(page.getByRole('group', { name: 'O que fazer com este título' })).toBeVisible();
    await expect(page.locator('#m-ambient')).toHaveAttribute('style', /1\.jpg/);

    const tabs = page.getByRole('navigation', { name: 'Partes da página do título' });
    await expect(tabs.getByRole('button', { name: 'Episódios' })).toBeHidden(); // filme não tem
    await expect(tabs.getByRole('button', { name: 'Sobre' })).toHaveAttribute('aria-current', 'true');

    await tabs.getByRole('button', { name: 'Elenco' }).click();
    await expect(tabs.getByRole('button', { name: 'Elenco' })).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#sec-elenco')).toBeFocused();
    await expect(page.locator('#sec-elenco')).toBeInViewport();

    await tabs.getByRole('button', { name: 'Parecidos' }).click();
    const similar = page.locator('#m-similar');
    await expect(similar.getByRole('button')).toHaveCount(4);
    await expect(similar.getByRole('button', { name: 'Filme Um' })).toHaveCount(0); // não indica ele mesmo

    await similar.getByRole('button', { name: 'Filme Três' }).click();
    await expect(page.locator('#m-title')).toHaveText('Filme Três');
    await expect(modal(page)).toBeVisible();
    await expect(tabs.getByRole('button', { name: 'Sobre' })).toHaveAttribute('aria-current', 'true');
    expect(await modal(page).evaluate(el => el.scrollTop)).toBe(0);
  });

  test('sem recomendações, a aba e a seção "Parecidos" somem; série mostra "Episódios"', async ({ page }) => {
    await openTitle(page, 'movie-4');
    await expect(page.locator('#m-title')).toHaveText('Filme Quatro');
    await expect(page.locator('#sec-parecidos')).toBeHidden();
    await expect(page.locator('#tab-parecidos')).toBeHidden();

    await openTitle(page, 'tv-2');
    await expect(page.locator('#episodes-list .episode-item').first()).toBeVisible();
    await expect(page.locator('#tab-episodios')).toBeVisible();
  });

  test('"Salvar" acende quando o título está em "Quero assistir"', async ({ page }) => {
    await openTitle(page, 'movie-2');
    const save = page.locator('#btn-salvar');
    await expect(save).not.toHaveClass(/is-on/);
    await save.click(); // salva e fecha
    await expect(modal(page)).toBeHidden();
    await openTitle(page, 'movie-2');
    await expect(save).toHaveClass(/is-on/);
    await expect(save).toHaveText('Remover da Lista');
  });

  test('Roleta: põe e tira sem sair do título; "Ir para a roleta" leva até lá', async ({ page }) => {
    await openTitle(page, 'movie-1');
    const wheel = page.locator('#btn-roleta');
    const note = page.locator('#m-roulette-note');
    await expect(wheel).toHaveAttribute('aria-pressed', 'false');

    await wheel.click();
    await expect(modal(page)).toBeVisible(); // continua no título
    await expect(wheel).toHaveAttribute('aria-pressed', 'true');
    await expect(wheel).toHaveText('Na roleta');
    await expect(note).toContainText('Na roleta: 1 opção. Ponha mais uma para girar.');

    await wheel.click(); // tira
    await expect(wheel).toHaveAttribute('aria-pressed', 'false');
    await expect(note).toBeHidden();

    await wheel.click();
    await note.getByRole('button', { name: 'Ir para a roleta' }).click();
    await expect(modal(page)).toBeHidden();
    await expect(page.locator('#roulette-pool')).toContainText('Filme Um');
  });
});
