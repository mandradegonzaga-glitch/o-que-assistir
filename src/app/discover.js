// Descobrir: filtros, sorteio, Top 10 e busca
import { isAbortError, latestSignal, tmdbFetch, tmdbGet } from '../api/tmdb.js';
import { ph } from '../ui/phosphor.js';
import { addToSorteioHistory } from './sorteioHistory.js';
import { abrirModal } from './titleModal.js';
import { syncUrl } from './urlSync.js';
import { resolveProviderFilter } from './myProviders.js';
import { RELEASE_DAYS, buildDiscoverUrl, getRandomPage, hasLatinTitle } from '../domain/filters.js';
import { GENRE_NAMES } from '../domain/genres.js';
import { SURPRISE_QUALITY, surpriseGenres } from '../domain/surprise.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { IMG_URL } from '../config/constants.js';

const RECENT_DRAWS = 20;


// Foto padrão de pessoa (local: evita requisição a serviço de terceiros por pessoa sem foto)

export const PERSON_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect width="60" height="60" fill="#1f1f1f"/><circle cx="30" cy="23" r="11" fill="#555"/><path d="M10 56c3-11 11-17 20-17s17 6 20 17" fill="#555"/></svg>');

// FILTRO ATOR (com debounce implementado via input)

export async function buscarPessoa(val) {
    if(val.length < 3) {
        document.getElementById('actor-list').style.display = 'none';
        return;
    }

    try {
        const data = await tmdbGet('/search/person', { query: val }, { signal: latestSignal('person') });
        renderPersonSuggestions(data.results);
    } catch(e) {
        if (!isAbortError(e)) console.error('Erro ao buscar pessoa:', e);
    }
}

export function renderPersonSuggestions(results) {
    const box = document.getElementById('actor-list');
    box.innerHTML = '';
    box.style.display = 'block';

    results.slice(0,5).forEach((p) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', '0');
        item.dataset.action = 'selectPerson';
        item.dataset.id = p.id;
        item.dataset.name = p.name;
        item.innerHTML = `<img class="suggestion-img" src="${p.profile_path ? IMG_URL+p.profile_path : PERSON_PLACEHOLDER}" alt="" width="36" height="36" loading="lazy"> ${escapeHtml(p.name)}`;
        box.appendChild(item);
    });
}

export function selectPerson(id, name) {
    state.personId = id;
    document.getElementById('actor-input').value = '';
    document.getElementById('actor-list').style.display = 'none';
    document.getElementById('selected-person').style.display = 'flex';
    document.getElementById('person-name').innerText = name;
    syncUrl();
}

export function limparPessoa() {
    state.personId = null;
    document.getElementById('selected-person').style.display = 'none';
    syncUrl();
}

// LÓGICA PRINCIPAL

export function getFilterOptions() {
    return {
        genre: document.getElementById('input-genero').value,
        mood: document.getElementById('input-mood').value,
        provider: resolveProviderFilter(),
        duration: document.getElementById('duration-select').value,
        yearFrom: document.getElementById('year-from').value,
        yearTo: document.getElementById('year-to').value,
        personId: state.personId,
        country: document.getElementById('input-country').value,
    };
}

// "Filmes · Terror · Netflix": os filtros que estão valendo, para mostrar dentro dos modos que os usam
const TYPE_NAMES = { movie: 'Filmes', tv: 'Séries', dorama: 'Doramas' };
export function filtersSummary() {
    const chosen = id => {
        const el = document.getElementById(id);
        return el && el.value && !el.disabled ? el.selectedOptions[0].textContent.trim() : '';
    };
    const from = document.getElementById('year-from').value.trim();
    const to = document.getElementById('year-to').value.trim();
    const years = from && to ? `${from} a ${to}` : from ? `desde ${from}` : to ? `até ${to}` : '';
    const person = state.personId ? document.getElementById('person-name').textContent : '';
    const parts = [person, chosen('input-mood'), chosen('input-genero'), chosen('input-provider'), chosen('duration-select'), chosen('input-country'), years].filter(Boolean);
    return [TYPE_NAMES[state.type], ...(parts.length ? parts : ['todos os gêneros'])].join(' · ');
}

export async function sortearOutro() {
    const btn = document.getElementById('btn-sortear-outro');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.classList.add('loading');
    await sortearFilme();
    btn.disabled = false;
    btn.classList.remove('loading');
    document.getElementById('modal-resultado').scrollTop = 0;
}

// Um da lista: com pôster, fora da blacklist e (se der) fora do que já foi visto e do que acabou de sair.
// `extra` filtra mais (ex.: só com sinopse, para a Sessão às escuras). null se não sobrar nenhum.
export function pickDraw(lista, extra = () => true) {
    const valid = (lista || []).filter(m => m.poster_path && !session.blacklist.includes(m.id) && extra(m));
    if (valid.length === 0) return null;
    const vistos = new Set((session.user?.history || []).map(h => h.id));
    const recentes = new Set(session.sorteioHistory.slice(0, RECENT_DRAWS).map(h => h.id));
    const novos = valid.filter(m => !recentes.has(m.id) && !vistos.has(m.id));
    const opcoes = novos.length > 0 ? novos : valid; // se só restar isso, repete em vez de falhar
    const escolhido = opcoes[Math.floor(Math.random() * opcoes.length)];
    return { ...escolhido, media_type: escolhido.media_type || state.type }; // cópia: a resposta fica no cache
}

// Detalhes completos (duração, temporadas, gêneros com nome); sem eles abre com o resumo
export async function withDetails(item, endpoint) {
    try {
        return { ...item, ...await tmdbGet(`/${endpoint}/${item.id}`), media_type: item.media_type };
    } catch (e) {
        console.error('Erro ao carregar detalhes do sorteado:', e);
        return item;
    }
}

const busy = async (id, task) => {
    const btn = document.getElementById(id);
    if (btn.disabled) return;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    try {
        await task();
    } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
    }
};

// Surpreenda-me: gênero que a pessoa quase nunca vê, só títulos bem avaliados
export function surpreendaMe() {
    return busy('btn-surpresa', async () => {
        const endpoint = state.type === 'dorama' ? 'tv' : state.type;
        const quality = SURPRISE_QUALITY[state.type];
        try {
            for (const genre of surpriseGenres(session.user?.history, state.type).slice(0, 4)) {
                const url = buildDiscoverUrl(endpoint, {
                    genre: String(genre),
                    provider: resolveProviderFilter(),
                    country: document.getElementById('input-country').value,
                    isDorama: state.type === 'dorama',
                    minVotes: quality['vote_count.gte'],
                }) + `&vote_average.gte=${quality['vote_average.gte']}`;
                let data = await tmdbFetch(url + `&page=${getRandomPage(3)}`);
                if (!data.results?.length) data = await tmdbFetch(url + '&page=1');
                const sorteado = pickDraw(data.results);
                if (!sorteado) continue;
                abrirModal(await withDetails(sorteado, endpoint), { fromDraw: true });
                addToSorteioHistory(sorteado);
                showToast(`Fora da sua zona de conforto: ${GENRE_NAMES[genre]}`);
                return;
            }
            showToast('Não achei uma surpresa com esses filtros. Tente outra plataforma.', 'error');
        } catch (e) {
            console.error(e);
            showToast('Erro na API.', 'error');
        }
    });
}

export async function sortearFilme() {
    const btn = document.getElementById('btn-sortear');
    if (btn.disabled) return; // evita sorteios duplicados com cliques repetidos
    btn.innerHTML = ph('circle-notch', { weight: 'bold', cls: 'icon spin icon-16 icon-lead-6' }) + 'Buscando...';
    btn.disabled = true;
    btn.classList.add('loading');

    const endpoint = state.type === 'dorama' ? 'tv' : state.type;
    const similarInput = document.getElementById('input-similar').value.trim();

    try {
        let lista = [];

        // Se o campo "Parecido com..." estiver preenchido
        if (similarInput.length > 2) {
            // Buscar o título informado
            const buscaData = await tmdbGet(`/search/${endpoint}`, { query: similarInput });

            if (buscaData.results && buscaData.results.length > 0) {
                // Pegar recomendações do primeiro resultado
                const tituloEncontrado = buscaData.results[0];
                const recData = await tmdbGet(`/${endpoint}/${tituloEncontrado.id}/recommendations`);

                if (recData.results && recData.results.length > 0) {
                    lista = recData.results;
                    showToast(`Buscando similares a "${tituloEncontrado.title || tituloEncontrado.name}"...`);
                } else {
                    // Se não houver recomendações, tentar similares
                    const simData = await tmdbGet(`/${endpoint}/${tituloEncontrado.id}/similar`);
                    lista = simData.results || [];
                }
            } else {
                showToast("Não encontrei esse título. Tente outro nome!", "error");
                btn.innerHTML = ph('shuffle', { weight: 'bold', cls: 'icon icon-18 icon-lead-6' }) + 'Sortear Agora';
                btn.disabled = false;
                btn.classList.remove('loading');
                return;
            }
        } else {
            // Busca normal com filtros
            const url = buildDiscoverUrl(endpoint, {
                genre: document.getElementById('input-genero').value,
                mood: document.getElementById('input-mood').value,
                provider: resolveProviderFilter(),
                duration: document.getElementById('duration-select').value,
                yearFrom: document.getElementById('year-from').value,
                yearTo: document.getElementById('year-to').value,
                personId: state.personId,
                country: document.getElementById('input-country').value,
                isDorama: state.type === 'dorama',
            });

            let data = await tmdbFetch(url + `&page=${getRandomPage()}`);

            if(!data.results || data.results.length === 0) {
                data = await tmdbFetch(url + '&page=1');
            }

            lista = data.results || [];
        }

        const sorteado = pickDraw(lista);
        if (sorteado) {
            abrirModal(await withDetails(sorteado, endpoint), { fromDraw: true });
            addToSorteioHistory(sorteado);
        } else {
            showToast("Nada encontrado (ou tudo na sua blacklist)!", "error");
        }
    } catch(e) {
        console.error(e);
        showToast("Erro na API.", "error");
    }
    btn.innerHTML = ph('shuffle', { weight: 'bold', cls: 'icon icon-18 icon-lead-6' }) + 'Sortear Agora';
    btn.disabled = false;
    btn.classList.remove('loading');
}

// SKELETON LOADERS

export function showSkeletonLoader() {
    const area = document.getElementById('results-area');
    area.innerHTML = '';
    area.style.display = 'grid';
    for (let i = 0; i < 10; i++) {
        area.innerHTML += '<div class="skeleton-card"></div>';
    }
}

export async function mostrarTop10() {
    const btn = document.getElementById('btn-top10');
    if (btn.disabled) return;
    btn.innerHTML = ph('circle-notch', { weight: 'bold', cls: 'icon spin icon-16 icon-lead-6' }) + 'Carregando...';
    btn.disabled = true;
    btn.classList.add('loading');

    showSkeletonLoader();

    try {
        const endpoint = state.type === 'dorama' ? 'tv' : state.type;
        const data = await tmdbFetch(buildDiscoverUrl(endpoint, {
            genre: document.getElementById('input-genero').value,
            mood: document.getElementById('input-mood').value,
            provider: resolveProviderFilter(),
            yearFrom: document.getElementById('year-from').value,
            yearTo: document.getElementById('year-to').value,
            country: document.getElementById('input-country').value,
            isDorama: state.type === 'dorama',
            minVotes: 100,
        }));
        renderResults(data.results.slice(0,10), true);
        showToast("Top 10 carregado!");
    } catch(e) {
        showToast("Erro ao carregar Top 10", "error");
    } finally {
        btn.innerHTML = ph('fire', { weight: 'regular', cls: 'icon icon-18 icon-lead-6' }) + 'Ver Top 10';
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// Lançamentos: o que chegou nas últimas semanas, com os mesmos filtros de gênero, clima e plataforma
export async function mostrarLancamentos() {
    const btn = document.getElementById('btn-lancamentos');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.classList.add('loading');
    btn.setAttribute('aria-busy', 'true');
    showSkeletonLoader();

    const endpoint = state.type === 'dorama' ? 'tv' : state.type;
    try {
        const data = await tmdbFetch(buildDiscoverUrl(endpoint, {
            genre: document.getElementById('input-genero').value,
            mood: document.getElementById('input-mood').value,
            provider: resolveProviderFilter(),
            personId: state.personId,
            country: document.getElementById('input-country').value,
            isDorama: state.type === 'dorama',
            minVotes: 0,
            releases: { today: new Date() },
        }));
        const days = RELEASE_DAYS[endpoint];
        const caption = endpoint === 'movie'
            ? `Chegaram ao streaming e ao aluguel nos últimos ${days} dias`
            : `${state.type === 'dorama' ? 'Doramas' : 'Séries'} que estrearam nos últimos ${days} dias`;
        renderResults((data.results || []).filter(hasLatinTitle).slice(0, 20), false, { caption, empty: 'Nenhum lançamento com esses filtros nas últimas semanas' });
    } catch (e) {
        console.error(e);
        document.getElementById('results-area').innerHTML = '';
        showToast('Erro ao carregar os lançamentos', 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.removeAttribute('aria-busy');
    }
}

export function renderResults(list, rank=false, { caption = '', empty = '' } = {}) {
    const area = document.getElementById('results-area');
    area.innerHTML = '';
    area.style.display = 'grid';
    if (caption && list.length > 0) {
        const note = document.createElement('p');
        note.className = 'results-caption grid-full';
        note.textContent = caption;
        area.appendChild(note);
    }

    if(list.length === 0) {
        area.innerHTML = `
            <div class="empty-state grid-full">
                <div class="empty-state-icon">${ph('magnifying-glass', { weight: 'duotone' })}</div>
                <h3 class="empty-state-title">${escapeHtml(empty || 'Nenhum resultado encontrado')}</h3>
                <p class="empty-state-desc">Tente ajustar seus filtros ou fazer uma nova busca</p>
                <button class="empty-state-cta ripple" data-action="focusSearch">
                    ${ph('magnifying-glass', { weight: 'bold', cls: 'icon-16 icon-lead-6' })}Nova Busca
                </button>
            </div>
        `;
        return;
    }

    list.forEach((f, i) => {
        if(f.poster_path) {
            const title = f.title || f.name;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'result-item';
            item.setAttribute('aria-label', `${title}${rank ? `, posição ${i+1}` : ''}`);
            item.dataset.action = 'carregarDetalhes';
            item.dataset.id = f.id;
            item.dataset.media = state.type;

            item.innerHTML = `
                ${rank ? `<span class="result-rank">${i+1}º</span>` : ''}
                <img src="${IMG_URL + f.poster_path}" alt="${escapeHtml(title)}" width="500" height="750" loading="lazy">
                <span class="result-title-preview">${escapeHtml(title)}</span>
            `;

            area.appendChild(item);
        }
    });
}

// SEARCH HISTORY


export async function buscarDireto() {
    const query = document.getElementById('direct-search').value;
    const area = document.getElementById('results-area');

    if(query.length < 2) {
        showToast("Digite pelo menos 2 caracteres", "error");
        return;
    }

    area.innerHTML = '<p class="text-secondary grid-full">Buscando...</p>';
    area.style.display = 'grid';

    showSkeletonLoader();

    try {
        const endpoint = state.type === 'dorama' ? 'tv' : state.type;

        const data = await tmdbGet(`/search/${endpoint}`, { query }, { signal: latestSignal('search') });

        area.innerHTML = '';

        if(data.results.length === 0) {
            area.innerHTML = `
                <div class="empty-state grid-full">
                    <div class="empty-state-icon">${ph('magnifying-glass', { weight: 'duotone' })}</div>
                    <h3 class="empty-state-title">Nenhum resultado para "${escapeHtml(query)}"</h3>
                    <p class="empty-state-desc">Tente palavras diferentes ou verifique a ortografia</p>
                </div>
            `;
            return;
        }

        renderResults(data.results);
    } catch(e) {
        if (isAbortError(e)) return;
        console.error(e);
        showToast("Erro na busca", "error");
    }
}
