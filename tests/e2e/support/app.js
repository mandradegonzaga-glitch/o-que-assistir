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
  // "Parecidos": o título 4 não tem nenhum (a aba some)
  if (/\/recommendations$/.test(path)) return { results: /\/4\/recommendations$/.test(path) ? [] : LIST.filter(i => !path.includes(`/${i.id}/`)) };
  if (/\/watch\/providers$/.test(path)) return { results: {} };
  if (/\/external_ids$/.test(path)) return { imdb_id: 'tt0000001' };
  if (/\/season\/\d+$/.test(path)) return { season_number: 1, episodes: [1, 2, 3].map(n => ({ season_number: 1, episode_number: n, name: `Episódio ${n}` })) };
  const id = Number(path.split('/').pop());
  const found = LIST.find(i => i.id === id) || title(id, `Título ${id}`);
  // Duração e elenco (append_to_response=credits) para as horas e o ator mais visto do perfil
  const credits = { cast: [{ id: 900, name: 'Atriz Teste' }, { id: 1000 + id, name: `Ator ${id}` }] };
  return { ...found, number_of_seasons: 1, number_of_episodes: 3, runtime: 120, episode_run_time: [45], credits };
}

export const test = base.extend({
  // Opções: test.use({ logged: true }) simula a sessão
  logged: [false, { option: true }],
  // Último dia em que as indicações do dia foram vistas. 'today' (padrão): o pop-up não abre sozinho
  // e não cobre o que os testes clicam. null: nunca vistas. Outro valor ('2026-11-02'): vistas nesse dia.
  dailySeen: ['today', { option: true }],
  errors: async ({}, use) => use([]),
  tmdbUrls: async ({}, use) => use([]),

  page: async ({ page, logged, dailySeen, errors, tmdbUrls }, use) => {
    await prepare(page, { logged, dailySeen, errors, tmdbUrls });
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

async function prepare(page, { logged, dailySeen = 'today', errors, tmdbUrls }) {
  await page.addInitScript(({ logged, dailySeen }) => {
    window.__TEST = { logged };
    localStorage.setItem('has_visited', 'true');
    sessionStorage.setItem('splash_seen', '1'); // a abertura tem testes próprios (splash.spec.js)
    if (dailySeen === 'today') {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      localStorage.setItem('daily_picks_seen', JSON.stringify(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`));
    } else if (!sessionStorage.getItem('__dailySeenSet')) {
      // Só na primeira carga: ao recarregar vale o que o app gravou
      sessionStorage.setItem('__dailySeenSet', '1');
      if (dailySeen) localStorage.setItem('daily_picks_seen', JSON.stringify(dailySeen));
      else localStorage.removeItem('daily_picks_seen');
    }
  }, { logged, dailySeen });

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

// A Biblioteca é uma tela própria (aba do topo no computador): abre e escolhe a aba
// A Biblioteca abre na visão geral (cartões); dentro de uma parte, as abas trocam de parte
export async function openLibraryTab(page, tab) {
  const library = page.locator('#tab-mode-library');
  if ((await library.getAttribute('aria-selected')) !== 'true') await library.click();
  const tile = page.locator(`#library-overview [data-arg="${tab}"]`);
  if (await tile.isVisible()) await tile.click();
  else await page.locator(`#tab-${tab}`).click();
  // O cartão abre em leque antes da lista: sem esperar, o passo seguinte corria contra a abertura
  await expect(page.locator(`#tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
}

export async function openLibrary(page) {
  await openLibraryTab(page, 'watchlist');
}

// Filtros em pílulas (o <select> fica escondido, guardando o valor): toca na pílula do valor
export async function pickChip(page, selectId, value) {
  await expandFilters(page);
  const chip = page.locator(`.chip-group[data-chips-for="${selectId}"] .chip[data-value="${value}"]`);
  if ((await chip.count()) === 0) {
    await page.locator(`.chip-field:has([data-chips-for="${selectId}"]) [data-chips-expand]`).click(); // "Ver todos"
  }
  await chip.click();
}

// Ator, parecido com, país e ano ficam em "Mais filtros"
export async function openMoreFilters(page) {
  await expandFilters(page);
  const details = page.locator('#more-filters');
  if (!(await details.evaluate(el => el.open))) await page.locator('#more-filters summary').click();
}

// Os Filtros começam recolhidos (o resumo mostra o que vale)
export async function expandFilters(page) {
  const toggle = page.locator('#filters-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

// Top 10 abre e fecha pela mesma pílula: só toca se a lista ainda não estiver aberta
export async function showTop10(page) {
  const top10 = page.locator('#btn-top10');
  if ((await top10.getAttribute('aria-pressed')) !== 'true') await top10.click();
}
