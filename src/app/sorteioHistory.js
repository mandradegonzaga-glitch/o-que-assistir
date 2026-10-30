// Histórico de sorteios
import { supabaseAddToSorteioHistory, supabaseClearSorteioHistory } from '../api/supabase.js';
import { carregarDetalhes } from './titleModal.js';
import { MAX_SORTEIO_HISTORY, session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { escapeHtml } from '../utils/escapeHtml.js';

// ================================================
// HISTÓRICO DE SORTEIOS
// ================================================


export async function addToSorteioHistory(item) {
    // Evitar duplicatas - atualiza timestamp se já existir
    const existingIndex = session.sorteioHistory.findIndex(h => h.id === item.id);
    if (existingIndex !== -1) {
        session.sorteioHistory.splice(existingIndex, 1);
    }

    const entry = {
        id: item.id,
        title: item.title || item.name,
        poster_path: item.poster_path,
        media_type: item.media_type || state.type
    };

    session.sorteioHistory.unshift(entry);

    if (session.sorteioHistory.length > MAX_SORTEIO_HISTORY) {
        session.sorteioHistory.pop();
    }

    session.sorteioHistoryIndex = 0;
    updateHistoryNav();
    updateHistoryButton();

    // Salvar no Supabase (se logado)
    if (session.currentUserId && session.currentUser !== 'guest') {
        await supabaseAddToSorteioHistory(session.currentUserId, item);
    } else {
        localStorage.setItem('sorteio_history', JSON.stringify(session.sorteioHistory));
    }
}

export function navigateSorteio(direction) {
    const newIndex = session.sorteioHistoryIndex + direction;
    if (newIndex >= 0 && newIndex < session.sorteioHistory.length) {
        session.sorteioHistoryIndex = newIndex;
        const item = session.sorteioHistory[session.sorteioHistoryIndex];
        carregarDetalhes(item.id, item.media_type);
        updateHistoryNav();
    }
}

export function updateHistoryNav() {
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

export function updateHistoryButton() {
    const btn = document.getElementById('btn-show-history');
    if (!btn) return;
    btn.style.display = session.sorteioHistory.length > 0 ? 'flex' : 'none';
    const countSpan = btn.querySelector('.history-count');
    if (countSpan) countSpan.innerText = session.sorteioHistory.length;
}

export function abrirHistoricoSorteios() {
    const grid = document.getElementById('sorteio-history-grid');

    if (session.sorteioHistory.length === 0) {
        grid.innerHTML = '<p class="text-secondary text-center grid-full">Nenhum sorteio ainda!</p>';
    } else {
        grid.innerHTML = session.sorteioHistory.map((item, idx) => `
            <button type="button" class="history-item ${idx === session.sorteioHistoryIndex ? 'current' : ''}"
                 data-action="abrirDoHistorico" data-arg="${idx}">
                <img src="https://image.tmdb.org/t/p/w200${item.poster_path}" width="200" height="300"
                     alt="" loading="lazy">
                <span class="history-item-title">${escapeHtml(item.title)}</span>
                ${idx === 0 ? '<span class="history-badge">Último</span>' : ''}
            </button>
        `).join('');
    }

    document.getElementById('modal-sorteio-history').style.display = 'flex';
}

export function abrirDoHistorico(index) {
    session.sorteioHistoryIndex = index;
    document.getElementById('modal-sorteio-history').style.display = 'none';
    const item = session.sorteioHistory[index];
    carregarDetalhes(item.id, item.media_type);
}

export async function limparHistoricoSorteios() {
    if (!(await confirmDialog({ title: 'Limpar histórico de sorteios', message: 'Limpar todo o histórico de sorteios?', confirmLabel: 'Limpar', danger: true }))) return;

    session.sorteioHistory = [];
    session.sorteioHistoryIndex = -1;
    updateHistoryButton();

    if (session.currentUserId && session.currentUser !== 'guest') {
        await supabaseClearSorteioHistory(session.currentUserId);
    } else {
        localStorage.removeItem('sorteio_history');
    }

    showToast('Histórico limpo!');
    document.getElementById('modal-sorteio-history').style.display = 'none';
}
