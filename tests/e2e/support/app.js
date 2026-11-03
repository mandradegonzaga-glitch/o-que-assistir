// Fixture dos testes: Supabase e TMDB simulados, e falha se a página registrar erro inesperado.
import { readFileSync } from 'node:fs';
import { test as base, expect } from '@playwright/test';

const FAKE_SDK = readFileSync(new URL('./fakeSupabase.js', import.meta.url), 'utf8');
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const title = (id, name) => ({ id, title: name, name, overview: `Sinopse de ${name}`, poster_path: `/${id}.jpg`, backdrop_path: `/${id}b.jpg`, vote_average: 8.456, release_date: '2020-01-01', first_air_date: '2020-01-01', genre_ids: [18] });
export const LIST = [title(1, 'Filme Um'), title(2, 'Filme Dois'), title(3, 'Filme Três'), title(4, 'Filme Quatro'), title(5, 'Filme Cinco')];

function tmdbResponse(pathname) {
  const path = pathname.replace(/^.*\/tmdb/, '');
  if (/^\/watch\/providers\/(movie|tv)$/.test(path)) {
    return { results: [
      { provider_id: 8, provider_name: 'Netflix' },
      { provider_id: 300, provider_name: 'Pluto TV' },
      { provider_id: 19, provider_name: 'NetMovies' },
      { provider_id: 2, provider_name: 'Apple TV Store' },
      { provider_id: 683, provider_name: 'Looke Amazon Channel' },
    ] };
  }
  if (path.startsWith('/discover') || path.startsWith('/search')) return { results: LIST };
  if (/\/credits$/.test(path)) return { cast: [{ name: 'Atriz Teste', profile_path: null }] };
  if (/\/videos$/.test(path)) return { results: [] };
  if (/\/watch\/providers$/.test(path)) return { results: {} };
  if (/\/external_ids$/.test(path)) return { imdb_id: 'tt0000001' };
  if (/\/season\/\d+$/.test(path)) return { season_number: 1, episodes: [1, 2, 3].map(n => ({ season_number: 1, episode_number: n, name: `Episódio ${n}` })) };
  const id = Number(path.split('/').pop());
  const found = LIST.find(i => i.id === id) || title(id, `Título ${id}`);
  return { ...found, number_of_seasons: 1, number_of_episodes: 3 };
}

export const test = base.extend({
  // Opções: test.use({ logged: true }) simula a sessão
  logged: [false, { option: true }],
  errors: async ({}, use) => use([]),
  tmdbUrls: async ({}, use) => use([]),

  page: async ({ page, logged, errors, tmdbUrls }, use) => {
    await prepare(page, { logged, errors, tmdbUrls });
    await use(page);
    expect(errors, 'erros não tratados na página').toEqual([]);
  },

  // Segunda aba no mesmo navegador (Match ao vivo): mesmas simulações, como convidado
  openPage: async ({ context, errors, tmdbUrls }, use) => {
    await use(async () => {
      const other = await context.newPage();
      await prepare(other, { logged: false, errors, tmdbUrls });
      return other;
    });
  },
});

async function prepare(page, { logged, errors, tmdbUrls }) {
  await page.addInitScript(value => {
    window.__TEST = { logged: value };
    localStorage.setItem('has_visited', 'true');
  }, logged);

  await page.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: FAKE_SDK }));
  await page.route('**/fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/image.tmdb.org/**', route => route.fulfill({ contentType: 'image/png', body: PIXEL, headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.route('**/functions/v1/tmdb/**', route => {
    const url = new URL(route.request().url());
    tmdbUrls.push(url);
    return route.fulfill({ contentType: 'application/json', json: tmdbResponse(url.pathname) });
  });

  page.on('pageerror', error => errors.push(error.message));
}

export { expect };

export async function enterAsGuest(page) {
  await page.goto('/');
  await page.locator('#login-form [data-action="loginAsGuest"]').click();
  await expect(page.locator('#login-overlay')).toBeHidden();
}

export async function openApp(page, path = '/') {
  await page.goto(path);
  await expect(page.locator('#user-display')).toHaveText('Pessoa Teste');
}

export const modal = page => page.locator('#modal-resultado');
export const lastDiscover = urls => urls.filter(u => u.pathname.includes('/discover/')).pop();
