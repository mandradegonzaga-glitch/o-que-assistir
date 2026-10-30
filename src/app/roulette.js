// Roleta personalizada
import { supabaseIncrementRouletteWins } from '../api/supabase.js';
import { checkBadgeUnlock } from './profile.js';
import { fecharModal } from './titleModal.js';
import { computeSpinRotation } from '../domain/roulette.js';
import { session, state } from '../state/appState.js';
import { createConfetti, scheduleUndoable, showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { switchMode } from '../ui/navigation.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { CLOSE_ICON } from '../ui/icons.js';

// ROLETA

export function addRoletaItem() {
    const val = document.getElementById('roulette-input').value.trim();
    if(val) {
        state.rouletteItems.push(val);
        renderRoleta();
        document.getElementById('roulette-input').value = '';
        showToast("Item adicionado!");
    }
}

export function addCurrentToRoulette() {
    if(state.currentMovie) {
        const title = state.currentMovie.title || state.currentMovie.name;
        state.rouletteItems.push(title);
        renderRoleta();
        showToast("Adicionado à Roleta!");
        fecharModal();
        switchMode('roulette');
    }
}

export function renderRoleta() {
    const pool = document.getElementById('roulette-pool');
    pool.innerHTML = state.rouletteItems.map((i, idx) =>
        `<div class="pool-tag">${escapeHtml(i)} <button type="button" class="pool-tag__remove" data-action="removeRoletaItem" data-arg="${idx}" aria-label="Remover ${escapeHtml(i)} da roleta">${CLOSE_ICON}</button></div>`
    ).join('');

    if(state.rouletteItems.length > 0) {
        desenharRoleta();
    }
}

export function removeRoletaItem(idx) {
    const name = state.rouletteItems[idx];
    scheduleUndoable({
        message: `"${name}" removido da roleta.`,
        apply: () => {
            const hadFocus = !!document.activeElement?.closest('#roulette-pool');
            state.rouletteItems.splice(idx, 1);
            renderRoleta();
            if (state.rouletteItems.length === 0) document.getElementById('roulette-wheel').innerHTML = '';
            return hadFocus;
        },
        undo: (refocus) => {
            state.rouletteItems.splice(Math.min(idx, state.rouletteItems.length), 0, name);
            renderRoleta();
            if (refocus) document.querySelectorAll('#roulette-pool .pool-tag__remove')[idx]?.focus();
        },
        commit: () => {}, // só existe em memória
        focusAfter: () => document.querySelector('#roulette-pool .pool-tag__remove') || document.getElementById('roulette-input'),
    });
}

export function desenharRoleta() {
    const wheel = document.getElementById('roulette-wheel');
    wheel.innerHTML = '';

    if(state.rouletteItems.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    wheel.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const items = state.rouletteItems;
    const sliceAngle = (2 * Math.PI) / items.length;
    const colors = ['#ffc94d', '#3dd6c6', '#ff8fb8', '#9d8cff', '#ff9f5a'];

    items.forEach((item, i) => {
        const startAngle = i * sliceAngle - Math.PI / 2;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.arc(160, 160, 160, startAngle, endAngle);
        ctx.lineTo(160, 160);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#14101f';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.translate(160, 160);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#17121f'; // texto escuro: todas as fatias são claras
        ctx.font = "800 16px 'Big Shoulders Display', sans-serif";
        const text = item.length > 20 ? item.substring(0, 18) + '...' : item;
        ctx.fillText(text, 110, 5);
        ctx.restore();
    });
}

export function girarRoleta() {
    if(state.rouletteItems.length < 2) {
        showToast("Adicione pelo menos 2 itens!", "error");
        return;
    }

    desenharRoleta();

    const wheel = document.getElementById('roulette-wheel');
    const center = document.getElementById('roulette-result');
    const items = state.rouletteItems;

    const winnerIndex = Math.floor(Math.random() * items.length);
    const winner = items[winnerIndex];
    document.getElementById('roulette-winner').hidden = true;

    const totalRotation = computeSpinRotation(winnerIndex, items.length, 5 + Math.random() * 3);

    center.innerHTML = '<svg class="icon-40" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><circle cx="12" cy="12" r="3"/></svg>';
    wheel.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(async () => {
        center.innerHTML = '<svg class="icon-40" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        const winnerBox = document.getElementById('roulette-winner');
        winnerBox.textContent = `Hoje é dia de: ${winner}`;
        winnerBox.hidden = false;
        createConfetti();

        if (session.currentUserId) {
            // Incrementar vitórias no Supabase
            const result = await supabaseIncrementRouletteWins(session.currentUserId);
            if (result.success) {
                session.user.rouletteWins = result.wins;
            }
        } else {
            session.user.rouletteWins = (session.user.rouletteWins || 0) + 1;
        }

        // Verificar conquista
        await checkBadgeUnlock('Apostador');

        setTimeout(() => {
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';
            setTimeout(() => {
                wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
                desenharRoleta();
                center.innerHTML = '<svg class="icon-40" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="17" cy="17" r="1.5" fill="currentColor"/></svg>';
            }, 50);
        }, 2000);
    }, 4000);
}

export async function limparRoleta() {
    if(state.rouletteItems.length === 0) return;
    if (await confirmDialog({ title: 'Limpar roleta', message: 'Deseja limpar toda a lista da roleta?', confirmLabel: 'Limpar', danger: true })) {
        state.rouletteItems = [];
        renderRoleta();
        document.getElementById('roulette-result').innerHTML = '<svg class="icon-40" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="17" cy="17" r="1.5" fill="currentColor"/></svg>';
        document.getElementById('roulette-wheel').innerHTML = '';
        showToast("Lista limpa!");
    }
}
