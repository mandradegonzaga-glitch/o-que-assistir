// Abertura da Biblioteca (repasse do redesign, etapa 3): quatro cartões com a pilha de pôsteres
// e quantos títulos há em cada parte (modelo do app Binge). Tocar abre a pilha em leque
// (efeito do clleancode, escolhido pelo usuário) e entra na lista. As listas em si ficam em
// library.js e userLists.js; aqui só a visão geral e a troca entre ela e as listas.
import { session } from '../state/appState.js';
import { on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';
import { posterImg } from '../ui/icons.js';
import { whileBusy } from '../ui/busy.js';
import { afterAnimations, prefersReducedMotion } from '../ui/motion.js';
import { switchTab } from '../ui/navigation.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatCount, pluralize } from '../utils/format.js';
import { loadSeriesInProgress } from './library.js';

const STACK = 3;

const TILES = [
    // Os mesmos nomes das abas e dos avisos do app
    { tab: 'watchlist', name: 'Quero Assistir', one: 'título', many: 'títulos' },
    { tab: 'andando', name: 'Em Andamento', one: 'série', many: 'séries' },
    { tab: 'vistos', name: 'Já Assistidos', one: 'título', many: 'títulos' },
    { tab: 'listas', name: 'Minhas Listas', one: 'lista', many: 'listas' },
];

const els = () => ({
    overview: document.getElementById('library-overview'),
    browser: document.getElementById('library-browser'),
});

// Chegar na Biblioteca vindo de outra tela mostra a visão geral; escolher uma parte (cartão, aba,
// "Ver tudo" do Início, aba lembrada, lista aberta por link) mostra a lista. Pedir a Biblioteca
// estando nela (ex.: o app restaurando a tela ao abrir) não volta para a visão geral.
on('mode:changed', ({ mode, changed }) => { if (mode === 'library' && changed) showOverview(); });
on('tab:changed', showBrowser);
on('library:changed', () => { if (!els().overview?.hidden) renderOverview(); });

function showOverview() {
    const { overview, browser } = els();
    overview.hidden = false;
    browser.hidden = true;
    renderOverview();
}

function showBrowser() {
    const { overview, browser } = els();
    overview.hidden = true;
    browser.hidden = false;
}

// O que cada cartão mostra: quantos e os pôsteres do alto da pilha (os mais recentes primeiro)
function tileContent(tab) {
    const user = session.user;
    if (tab === 'watchlist') return { count: user.watchlist?.length || 0, posters: (user.watchlist || []).map(i => i.poster) };
    if (tab === 'vistos') return { count: user.history?.length || 0, posters: (user.history || []).map(i => i.poster) };
    if (tab === 'listas') return { count: user.lists?.length || 0, posters: (user.lists || []).flatMap(l => l.items.map(i => i.poster)) };
    return null; // Em andamento: depende do TMDB, chega depois
}

function tileHtml({ tab, name, one, many }, content) {
    const posters = (content?.posters || []).filter(Boolean).slice(0, STACK);
    const stack = Array.from({ length: STACK }, (_, i) => posters[i]
        ? posterImg(posters[i], { cls: 'library-tile__poster' })
        : '<span class="library-tile__poster library-tile__poster--empty"></span>').join('');
    const count = !content ? 'Carregando…'
        : content.count ? `${formatCount(content.count)} ${pluralize(content.count, one, many)}` : 'Nenhum ainda';
    return `<li><button type="button" class="library-tile" data-action="abrirAbaBiblioteca" data-arg="${tab}" aria-label="${escapeHtml(`${name}: ${count}`)}">
        <span class="library-tile__stack" aria-hidden="true">${stack}</span>
        <span class="library-tile__name">${name}</span>
        <span class="library-tile__count" data-count="${tab}">${count}</span>
    </button></li>`;
}

let renderSeq = 0;
async function renderOverview() {
    const { overview } = els();
    if (!overview || !session.currentUser) return;
    const seq = ++renderSeq;
    overview.innerHTML = `<ul class="library-overview__grid">${TILES.map(t => tileHtml(t, tileContent(t.tab))).join('')}</ul>`;

    const { series } = await loadSeriesInProgress();
    if (seq !== renderSeq) return; // outra visão geral foi desenhada enquanto esperava
    const tile = TILES.find(t => t.tab === 'andando');
    const li = overview.querySelector('[data-arg="andando"]')?.closest('li');
    if (li) li.outerHTML = tileHtml(tile, { count: series.length, posters: series.map(s => s.poster) });
}

// A pilha se abre em leque e só então a lista aparece; com "reduzir movimento", entra direto.
// Enquanto abre, os cartões ficam ocupados: um segundo toque em outro cartão abria a outra parte
// por cima da primeira.
function openSection(tile) {
    const tiles = [...els().overview.querySelectorAll('.library-tile')];
    return whileBusy(tiles, async () => {
        tile.classList.add('is-fanning');
        if (!prefersReducedMotion()) await afterAnimations(tile);
        tile.classList.remove('is-fanning');
        await switchTab(tile.dataset.arg);
        window.scrollTo({ top: 0 }); // a lista começa do alto, com o título à vista
    });
}

registerActions({
    click: {
        abrirAbaBiblioteca: openSection,
        abrirResumoBiblioteca: showOverview,
    },
});
