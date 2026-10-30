// Títulos ignorados ("Não tenho interesse")
import { supabaseAddToBlacklist, supabaseClearBlacklist, supabaseGetBlacklist, supabaseRemoveFromBlacklist } from '../api/supabase.js';
import { fecharModal } from './titleModal.js';
import { session, state } from '../state/appState.js';
import { pendingRemovals, scheduleUndoable, showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { CLOSE_ICON } from '../ui/icons.js';

// ================================================
// BLACKLIST (NÃO TENHO INTERESSE)
// ================================================


export async function adicionarBlacklist() {
    const item = state.currentMovie;
    if (!item) return;

    if (session.blacklist.includes(item.id)) {
        showToast('Já está na sua lista de ignorados!', 'warning');
        return;
    }

    session.blacklist.push(item.id);

    if (session.currentUserId && session.currentUser !== 'guest') {
        await supabaseAddToBlacklist(session.currentUserId, item);
    } else {
        localStorage.setItem('blacklist', JSON.stringify(session.blacklist));
        // Salvar detalhes também para exibição
        let details = JSON.parse(localStorage.getItem('blacklist_details') || '[]');
        details.push({
            tmdb_id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path
        });
        localStorage.setItem('blacklist_details', JSON.stringify(details));
    }

    showToast('Adicionado à lista de ignorados. Não será mais sugerido!');
    fecharModal();
}

export function removerBlacklist(tmdbId, btn) {
    const row = btn?.closest('.blacklist-item');
    const before = session.blacklist.slice();
    scheduleUndoable({
        message: 'Título voltará a ser sugerido.',
        apply: () => {
            const hadFocus = !!row?.contains(document.activeElement);
            session.blacklist = session.blacklist.filter(id => id !== tmdbId);
            pendingRemovals.add(`blacklist:${tmdbId}`);
            if (row) row.hidden = true;
            return hadFocus;
        },
        undo: (refocus) => {
            session.blacklist = before;
            pendingRemovals.delete(`blacklist:${tmdbId}`);
            if (row?.isConnected) { row.hidden = false; if (refocus) row.querySelector('button')?.focus(); }
            else renderBlacklist();
        },
        commit: async () => {
            pendingRemovals.delete(`blacklist:${tmdbId}`);
            if (session.currentUserId && session.currentUser !== 'guest') {
                await supabaseRemoveFromBlacklist(session.currentUserId, tmdbId);
            } else {
                localStorage.setItem('blacklist', JSON.stringify(session.blacklist));
                let details = JSON.parse(localStorage.getItem('blacklist_details') || '[]');
                details = details.filter(d => d.tmdb_id !== tmdbId);
                localStorage.setItem('blacklist_details', JSON.stringify(details));
            }
            renderBlacklist();
        },
        focusAfter: () => document.querySelector('.blacklist-item:not([hidden]) button') || document.getElementById('profile-title')?.closest('[role="dialog"]'),
    });
}

export async function renderBlacklist() {
    const container = document.getElementById('blacklist-container');
    const clearBtn = document.getElementById('btn-clear-blacklist');
    if (!container) return;

    if (session.blacklist.length === 0) {
        container.innerHTML = '<p class="text-tertiary text-center">Nenhum título ignorado</p>';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    let items = [];
    if (session.currentUserId && session.currentUser !== 'guest') {
        const result = await supabaseGetBlacklist(session.currentUserId);
        items = result.blacklist || [];
    } else {
        items = JSON.parse(localStorage.getItem('blacklist_details') || '[]');
    }
    items = items.filter(i => !pendingRemovals.has(`blacklist:${i.tmdb_id}`));

    container.innerHTML = items.map(item => `
        <div class="blacklist-item">
            <img src="https://image.tmdb.org/t/p/w92${item.poster_path}" alt="" width="40" height="60" loading="lazy">
            <span>${escapeHtml(item.title)}</span>
            <button type="button" data-action="removerBlacklist" data-arg="${item.tmdb_id}" title="Remover" aria-label="Voltar a sugerir ${escapeHtml(item.title)}">${CLOSE_ICON}</button>
        </div>
    `).join('');

    if (clearBtn) clearBtn.style.display = 'block';
}

export async function limparBlacklist() {
    if (!(await confirmDialog({ title: 'Limpar lista de ignorados', message: 'Os títulos voltarão a aparecer nos sorteios.', confirmLabel: 'Limpar', danger: true }))) return;

    if (session.currentUserId && session.currentUser !== 'guest') {
        await supabaseClearBlacklist(session.currentUserId);
    } else {
        localStorage.removeItem('blacklist');
        localStorage.removeItem('blacklist_details');
    }

    session.blacklist = [];
    renderBlacklist();
    showToast('Lista de ignorados limpa!');
}
