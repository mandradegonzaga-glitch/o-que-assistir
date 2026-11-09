// Histórico de sorteios
import { supabaseAddToSorteioHistory, supabaseClearSorteioHistory } from '../api/supabase.js';
import { abrirModal, carregarDetalhes } from './titleModal.js';
import { isAccount, session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { closeModal, confirmDialog, openModal } from '../ui/modals.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { tmdbImage } from '../domain/mediaItem.js';
import { createSorteioEntry, deduplicateHistory, trimHistory } from '../domain/history.js';
import { on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';
import { saveGuestSorteioHistory } from './guestLibrary.js';

// Lista carregada ao entrar (conta ou convidado): o mais recente fica selecionado
export function useSorteioHistory(items) {
    session.sorteioHistory = items;
    session.sorteioHistoryIndex = items.length > 0 ? 0 : -1;
}

// Saiu num sorteio (descobrir, surpresa, batalha, sessão às escuras): entra no histórico e abre,
// com "Sortear outro" à vista
export function openDrawn(item) {
    addToSorteioHistory(item);
    abrirModal(item, { fromDraw: true });
}

async function addToSorteioHistory(item) {
    const entry = createSorteioEntry({ ...item, media_type: item.media_type || state.type });
    session.sorteioHistory = trimHistory(deduplicateHistory(session.sorteioHistory, entry));

    session.sorteioHistoryIndex = 0;
    updateHistoryNav();
    updateHistoryButton();

    if (isAccount()) {
        await supabaseAddToSorteioHistory(session.currentUserId, item);
    } else {
        saveGuestSorteioHistory(session.sorteioHistory);
    }
}

function navigateSorteio(direction) {
    const newIndex = session.sorteioHistoryIndex + direction;
    if (newIndex >= 0 && newIndex < session.sorteioHistory.length) {
        session.sorteioHistoryIndex = newIndex;
        const item = session.sorteioHistory[session.sorteioHistoryIndex];
        carregarDetalhes(item.id, item.media_type);
        updateHistoryNav();
    }
}

on('title:opened', updateHistoryNav);

function updateHistoryNav() {
    const container = document.getElementById('history-nav');
    if (!container) return;

    if (session.sorteioHistory.length <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    document.getElementById('btn-history-prev').disabled = session.sorteioHistoryIndex >= session.sorteioHistory.length - 1;
    document.getElementById('btn-history-next').disabled = session.sorteioHistoryIndex <= 0;
    document.getElementById('history-indicator').innerText =
        `${session.sorteioHistory.length - session.sorteioHistoryIndex}/${session.sorteioHistory.length}`;
}

on('session:started', updateHistoryButton);
on('session:ended', updateHistoryButton);

function updateHistoryButton() {
    const btn = document.getElementById('btn-show-history');
    if (!btn) return;
    btn.style.display = session.sorteioHistory.length > 0 ? 'flex' : 'none';
    const countSpan = btn.querySelector('.history-count');
    if (countSpan) countSpan.innerText = session.sorteioHistory.length;
}

function abrirHistoricoSorteios() {
    const grid = document.getElementById('sorteio-history-grid');

    if (session.sorteioHistory.length === 0) {
        grid.innerHTML = '<p class="text-secondary text-center grid-full">Nenhum sorteio ainda!</p>';
    } else {
        grid.innerHTML = session.sorteioHistory.map((item, idx) => `
            <button type="button" class="history-item ${idx === session.sorteioHistoryIndex ? 'current' : ''}"
                 data-action="abrirDoHistorico" data-arg="${idx}">
                <img src="${tmdbImage(item.poster_path, 'w200')}" width="200" height="300"
                     alt="" loading="lazy">
                <span class="history-item-title">${escapeHtml(item.title)}</span>
                ${idx === 0 ? '<span class="history-badge">Último</span>' : ''}
            </button>
        `).join('');
    }

    openModal('modal-sorteio-history');
}

function abrirDoHistorico(index) {
    session.sorteioHistoryIndex = index;
    closeModal('modal-sorteio-history');
    const item = session.sorteioHistory[index];
    carregarDetalhes(item.id, item.media_type);
}

async function limparHistoricoSorteios() {
    if (!(await confirmDialog({ title: 'Limpar histórico de sorteios', message: 'Limpar todo o histórico de sorteios?', confirmLabel: 'Limpar', danger: true }))) return;

    session.sorteioHistory = [];
    session.sorteioHistoryIndex = -1;
    updateHistoryButton();

    if (isAccount()) {
        await supabaseClearSorteioHistory(session.currentUserId);
    } else {
        saveGuestSorteioHistory([]);
    }

    showToast('Histórico limpo!');
    closeModal('modal-sorteio-history');
}

registerActions({
    click: {
        abrirDoHistorico: el => abrirDoHistorico(Number(el.dataset.arg)),
        abrirHistoricoSorteios,
        limparHistoricoSorteios,
        navigateSorteio: el => navigateSorteio(Number(el.dataset.arg)),
    },
});
