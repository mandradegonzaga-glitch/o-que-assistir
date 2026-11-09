// Descobrir: filtros, sorteio, Top 10 e busca
import { isAbortError, latestSignal, titleDetails, tmdbGet } from '../api/tmdb.js';
import { ph } from '../ui/phosphor.js';
import { RELEASE_DAYS, hasLatinTitle } from '../domain/filters.js';
import { GENRE_NAMES } from '../domain/genres.js';
import { SURPRISE_QUALITY, surpriseGenres } from '../domain/surprise.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { drawReveal, endDrawReveal } from '../ui/drawReveal.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { MEDIA_KIND, getTmdbEndpoint, getTitle } from '../domain/mediaItem.js';
import { debounce } from '../utils/debounce.js';
import { personPhoto, posterImg } from '../ui/icons.js';
import { on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';
import { discoverRequest, fetchDiscover, fetchRandomPage, filtersKey, setFilters } from './filters.js';
import { openDrawn } from './sorteioHistory.js';
import { whileBusy } from '../ui/busy.js';

const RECENT_DRAWS = 20;

// FILTRO ATOR: some na hora quando o campo fica curto; busca 300 ms depois da última tecla

const searchPersonSoon = debounce(searchPerson, 300);

function buscarPessoa(val) {
    if (val.length < 3) {
        searchPersonSoon.cancel();
        latestSignal('person'); // descarta uma busca que ainda estava a caminho
        document.getElementById('actor-list').style.display = 'none';
        return;
    }
    searchPersonSoon(val);
}

async function searchPerson(val) {
    try {
        const data = await tmdbGet('/search/person', { query: val }, { signal: latestSignal('person') });
        renderPersonSuggestions(data.results);
    } catch(e) {
        if (!isAbortError(e)) console.error('Erro ao buscar pessoa:', e);
    }
}

function renderPersonSuggestions(results) {
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
        item.innerHTML = `<img class="suggestion-img" src="${personPhoto(p.profile_path)}" alt="" width="36" height="36" loading="lazy"> ${escapeHtml(p.name)}`;
        box.appendChild(item);
    });
}

function selectPerson(id, name) {
    document.getElementById('actor-input').value = '';
    document.getElementById('actor-list').style.display = 'none';
    setFilters({ personId: id, personName: name });
}

// A pílula da pessoa mostra o filtro, venha ele da busca ou de um link
on('filters:changed', () => {
    const { personId, personName } = state.filters;
    document.getElementById('selected-person').style.display = personId ? 'flex' : 'none';
    document.getElementById('person-name').innerText = personName;
});

async function sortearOutro() {
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
export async function withDetails(item) {
    try {
        return { ...item, ...await titleDetails(item.media_type, item.id), media_type: item.media_type };
    } catch (e) {
        console.error('Erro ao carregar detalhes do sorteado:', e);
        return item;
    }
}

// Surpreenda-me: gênero que a pessoa quase nunca vê, só títulos bem avaliados
function surpreendaMe() {
    return whileBusy(document.getElementById('btn-surpresa'), async () => {
        const quality = SURPRISE_QUALITY[state.type];
        let chosenGenre = null;
        const sorteado = await drawReveal(async () => {
            for (const genre of surpriseGenres(session.user?.history, state.type).slice(0, 4)) {
                // Só o gênero muda: clima, duração, anos e pessoa ficam de fora; plataforma e país valem
                const request = discoverRequest({ ...quality, genre: String(genre), mood: '', duration: '', yearFrom: '', yearTo: '', personId: null });
                const escolhido = pickDraw(await fetchRandomPage(request, { maxPage: 3 }));
                if (!escolhido) continue;
                chosenGenre = genre;
                return withDetails(escolhido);
            }
            return null;
        });
        if (!sorteado) {
            showToast('Não achei uma surpresa com esses filtros. Tente outra plataforma.', 'error');
            return;
        }
        openDrawn(sorteado);
        endDrawReveal();
        showToast(`Fora da sua zona de conforto: ${GENRE_NAMES[chosenGenre]}`);
    }, { failure: 'Erro na API.' });
}

// Lista para o sorteio: "Parecido com..." (recomendações do título informado) ou os filtros.
// null quando o título de "Parecido com..." não existe (o aviso já foi dado).
async function fetchDrawList(endpoint) {
    const similarInput = state.filters.similar;

    if (similarInput.length > 2) {
        const buscaData = await tmdbGet(`/search/${endpoint}`, { query: similarInput });
        if (!buscaData.results?.length) {
            showToast("Não encontrei esse título. Tente outro nome!", "error");
            return null;
        }
        // Recomendações do primeiro resultado; sem elas, os similares
        const tituloEncontrado = buscaData.results[0];
        const recData = await tmdbGet(`/${endpoint}/${tituloEncontrado.id}/recommendations`);
        if (recData.results?.length) {
            showToast(`Buscando similares a "${getTitle(tituloEncontrado)}"...`);
            return recData.results;
        }
        const simData = await tmdbGet(`/${endpoint}/${tituloEncontrado.id}/similar`);
        return simData.results || [];
    }

    return fetchRandomPage(discoverRequest());
}

async function sortearFilme() {
    const btn = document.getElementById('btn-sortear');
    if (btn.disabled) return; // evita sorteios duplicados com cliques repetidos
    const idle = btn.innerHTML;
    btn.innerHTML = ph('circle-notch', { weight: 'bold', cls: 'icon spin icon-16 icon-lead-6' }) + 'Buscando...';
    btn.disabled = true;
    btn.classList.add('loading');

    const endpoint = getTmdbEndpoint(state.type);

    try {
        // O baralho de ingressos embaralha enquanto a busca acontece e vira no sorteado (src/ui/drawReveal.js)
        const sorteado = await drawReveal(async () => {
            const lista = await fetchDrawList(endpoint);
            if (lista === null) return null;
            const escolhido = pickDraw(lista);
            if (!escolhido) {
                showToast("Nada encontrado (ou tudo na sua blacklist)!", "error");
                return null;
            }
            return withDetails(escolhido);
        });
        if (sorteado) {
            openDrawn(sorteado);
            endDrawReveal();
        }
    } catch(e) {
        console.error(e);
        showToast("Erro na API.", "error");
    } finally {
        btn.innerHTML = idle;
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

function showSkeletonLoader() {
    const area = document.getElementById('results-area');
    area.innerHTML = '';
    area.style.display = 'grid';
    for (let i = 0; i < 10; i++) {
        area.innerHTML += '<div class="skeleton-card"></div>';
    }
}

// Top 10 e Lançamentos são pílulas que abrem e fecham a lista: a que está aberta fica marcada,
// e tocar nela de novo fecha. "Fechar" ao lado dos resultados faz o mesmo.
const LIST_PILLS = ['btn-top10', 'btn-lancamentos'];

// O que define a lista: tipo e filtros. Mudou algo desde que abriu? Tocar de novo atualiza em vez de fechar.
let openListKey = null;

function markOpenList(btn) {
    LIST_PILLS.forEach(id => document.getElementById(id)?.setAttribute('aria-pressed', String(id === btn?.id)));
    openListKey = btn ? filtersKey() : null;
}

function closeIfOpen(btn) {
    if (btn.getAttribute('aria-pressed') !== 'true' || openListKey !== filtersKey()) return false;
    fecharResultados();
    return true;
}

// "Fechar" aparece só quando há resultados (de qualquer origem)
export function initHomeSearch() {
    const area = document.getElementById('results-area');
    const close = document.getElementById('results-close');
    if (!area || !close) return;
    const sync = () => { close.hidden = area.children.length === 0; };
    new MutationObserver(sync).observe(area, { childList: true });
    sync();
}

function fecharResultados() {
    const open = LIST_PILLS.map(id => document.getElementById(id)).find(b => b?.getAttribute('aria-pressed') === 'true');
    document.getElementById('results-area').innerHTML = '';
    markOpenList(null);
    (open || document.getElementById('direct-search'))?.focus();
}

// Carregando: só o nome muda e o ícone gira (o conteúdo do botão não é trocado)
function setPillLoading(btn, on) {
    const label = btn.querySelector('.list-pill__label');
    if (on) {
        btn.dataset.label = label.textContent;
        label.textContent = 'Carregando...';
    } else if (btn.dataset.label) {
        label.textContent = btn.dataset.label;
    }
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
    btn.toggleAttribute('aria-busy', on);
}

async function mostrarTop10() {
    const btn = document.getElementById('btn-top10');
    if (btn.disabled) return;
    if (closeIfOpen(btn)) return;
    setPillLoading(btn, true);

    showSkeletonLoader();

    try {
        const data = await fetchDiscover(discoverRequest({ duration: '', personId: null, minVotes: 100 }));
        renderResults(data.results.slice(0,10), true);
        markOpenList(btn);
    } catch(e) {
        showToast("Erro ao carregar Top 10", "error");
    } finally {
        setPillLoading(btn, false);
    }
}

// Lançamentos: o que chegou nas últimas semanas, com os mesmos filtros de gênero, clima e plataforma
async function mostrarLancamentos() {
    const btn = document.getElementById('btn-lancamentos');
    if (btn.disabled) return;
    if (closeIfOpen(btn)) return;
    setPillLoading(btn, true);
    showSkeletonLoader();

    const endpoint = getTmdbEndpoint(state.type);
    try {
        const data = await fetchDiscover(discoverRequest({ duration: '', yearFrom: '', yearTo: '', minVotes: 0, releases: { today: new Date() } }));
        const days = RELEASE_DAYS[endpoint];
        const caption = endpoint === 'movie'
            ? `Chegaram ao streaming e ao aluguel nos últimos ${days} dias`
            : `${MEDIA_KIND[state.type].many} que estrearam nos últimos ${days} dias`;
        renderResults((data.results || []).filter(hasLatinTitle).slice(0, 20), false, { caption, empty: 'Nenhum lançamento com esses filtros nas últimas semanas' });
        markOpenList(btn);
    } catch (e) {
        console.error(e);
        document.getElementById('results-area').innerHTML = '';
        showToast('Erro ao carregar os lançamentos', 'error');
    } finally {
        setPillLoading(btn, false);
    }
}

function renderResults(list, rank=false, { caption = '', empty = '' } = {}) {
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
                <button class="empty-state-cta" data-action="focusSearch">
                    ${ph('magnifying-glass', { weight: 'bold', cls: 'icon-16 icon-lead-6' })}Nova Busca
                </button>
            </div>
        `;
        return;
    }

    list.forEach((f, i) => {
        if(f.poster_path) {
            const title = getTitle(f);
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'result-item';
            item.setAttribute('aria-label', `${title}${rank ? `, posição ${i+1}` : ''}`);
            item.dataset.action = 'carregarDetalhes';
            item.dataset.id = f.id;
            item.dataset.media = state.type;

            item.innerHTML = `
                ${rank ? `<span class="result-rank">${i+1}º</span>` : ''}
                ${posterImg(f.poster_path, { alt: escapeHtml(title) })}
                <span class="result-title-preview">${escapeHtml(title)}</span>
            `;

            area.appendChild(item);
        }
    });
}

// SEARCH HISTORY

async function buscarDireto() {
    const query = document.getElementById('direct-search').value;
    const area = document.getElementById('results-area');

    if(query.length < 2) {
        showToast("Digite pelo menos 2 caracteres", "error");
        return;
    }

    markOpenList(null); // a busca toma o lugar da lista que estava aberta
    area.style.display = 'grid';

    showSkeletonLoader();

    try {
        const endpoint = getTmdbEndpoint(state.type);

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

registerActions({
    click: {
        buscarDireto,
        focusSearch: () => document.getElementById('direct-search').focus(),
        limparPessoa: () => setFilters({ personId: null }),
        mostrarTop10,
        mostrarLancamentos,
        surpreendaMe,
        selectPerson: el => selectPerson(Number(el.dataset.id), el.dataset.name),
        sortearFilme,
        sortearOutro,
        fecharResultados,
    },
    input: {
        buscarPessoa: el => buscarPessoa(el.value),
    },
    enter: {
        buscarDireto,
    },
});
