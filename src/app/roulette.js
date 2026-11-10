// Roleta personalizada
import { supabaseIncrementRouletteWins } from '../api/supabase.js';
import { saveGuestWins } from './guestLibrary.js';
import { checkAllBadges } from './badges.js';
import { grantXp, trackChallenge } from './progress.js';
import { fecharModal } from './titleModal.js';
import { computeSpinRotation } from '../domain/roulette.js';
import { isGuest, session, state } from '../state/appState.js';
import { createConfetti, scheduleUndoable, showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { switchMode } from '../ui/navigation.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { storage } from '../utils/storage.js';
import { CLOSE_ICON } from '../ui/icons.js';
import { STAR_ICON, TICKET_ICON, WHEEL_ICON } from '../ui/icons.js';
import { themeColor } from '../ui/themeColor.js';
import { getTitle } from '../domain/mediaItem.js';
import { on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';
import { afterAnimations, prefersReducedMotion } from '../ui/motion.js';

// "Reduzir movimento" no sistema: o CSS zera a transição (a roda vai direto ao vencedor);
// uma pausa curta ainda dá tempo de ver onde parou antes do resultado
const REDUCED_PAUSE_MS = 800;
const ITEMS_KEY = 'roulette_items';
let spinning = false;

export function initRoulette() {
    const saved = storage.get(ITEMS_KEY, []);
    if (Array.isArray(saved) && saved.length > 0) {
        state.rouletteItems = saved.filter(item => typeof item === 'string');
    }
    renderRoleta();
}

function addRoletaItem() {
    if (spinning) return;
    const val = document.getElementById('roulette-input').value.trim();
    if(val) {
        state.rouletteItems.push(val);
        renderRoleta();
        document.getElementById('roulette-input').value = '';
        showToast("Item adicionado!");
    }
}

// No título: põe (ou tira) da roleta sem sair dali; quem quiser vai para a roleta pelo aviso
const titleName = () => state.currentMovie && getTitle(state.currentMovie);

on('title:opened', () => {
    updateRouletteButton();
    hideRouletteNote();
});

function updateRouletteButton() {
    const btn = document.getElementById('btn-roleta');
    const name = titleName();
    if (!btn || !name) return;
    const inWheel = state.rouletteItems.includes(name);
    btn.classList.toggle('is-on', inWheel);
    btn.setAttribute('aria-pressed', String(inWheel));
    document.getElementById('btn-roleta-label').textContent = inWheel ? 'Na roleta' : 'Roleta';
}

function hideRouletteNote() {
    const note = document.getElementById('m-roulette-note');
    if (note) note.hidden = true;
}

function addCurrentToRoulette() {
    if (spinning) return;
    const name = titleName();
    if (!name) return;
    const note = document.getElementById('m-roulette-note');
    if (state.rouletteItems.includes(name)) {
        state.rouletteItems = state.rouletteItems.filter(item => item !== name);
        note.hidden = true;
        showToast('Tirado da roleta');
    } else {
        state.rouletteItems.push(name);
        const n = state.rouletteItems.length;
        document.getElementById('m-roulette-note-text').textContent =
            `Na roleta: ${n} ${n === 1 ? 'opção' : 'opções'}${n < 2 ? '. Ponha mais uma para girar.' : '.'}`;
        note.hidden = false;
    }
    renderRoleta();
    updateRouletteButton();
}

function goToRoulette() {
    fecharModal();
    switchMode('roulette');
}

function renderRoleta() {
    const pool = document.getElementById('roulette-pool');
    pool.innerHTML = state.rouletteItems.map((i, idx) =>
        `<div class="pool-tag">${escapeHtml(i)} <button type="button" class="pool-tag__remove" data-action="removeRoletaItem" data-arg="${idx}" aria-label="Remover ${escapeHtml(i)} da roleta">${CLOSE_ICON}</button></div>`
    ).join('');

    storage.set(ITEMS_KEY, state.rouletteItems);
    resetWheel();
    desenharRoleta();
    document.getElementById('roulette-winner').hidden = true;
    document.getElementById('roulette-result').innerHTML = TICKET_ICON;
    updateRouletteControls();
}

function removeRoletaItem(idx) {
    if (spinning) return;
    const name = state.rouletteItems[idx];
    scheduleUndoable({
        message: `"${name}" removido da roleta.`,
        apply: () => {
            const hadFocus = !!document.activeElement?.closest('#roulette-pool');
            state.rouletteItems.splice(idx, 1);
            renderRoleta();
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

function desenharRoleta() {
    const wheel = document.getElementById('roulette-wheel');
    wheel.innerHTML = '';

    if(state.rouletteItems.length === 0) return;

    const canvas = document.createElement('canvas');
    const scale = window.devicePixelRatio || 1; // nítido em telas de alta densidade
    canvas.width = 320 * scale;
    canvas.height = 320 * scale;
    wheel.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
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
        ctx.strokeStyle = themeColor('--bg-primary');
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.translate(160, 160);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = themeColor('--accent-on'); // texto escuro: todas as fatias são claras
        ctx.font = "800 16px 'Big Shoulders Display', sans-serif";
        const text = item.length > 20 ? item.substring(0, 18) + '...' : item;
        ctx.fillText(text, 110, 5);
        ctx.restore();
    });
}

async function girarRoleta() {
    if (spinning || state.rouletteItems.length < 2) return;

    const wheel = document.getElementById('roulette-wheel');
    const center = document.getElementById('roulette-result');
    const items = state.rouletteItems;

    const winnerIndex = Math.floor(Math.random() * items.length);
    const winner = items[winnerIndex];
    document.getElementById('roulette-winner').hidden = true;

    spinning = true;
    updateRouletteControls();
    resetWheel(); // a roda ficou parada no vencedor anterior

    center.innerHTML = WHEEL_ICON;
    const reduce = prefersReducedMotion();
    wheel.style.transform = `rotate(${computeSpinRotation(winnerIndex, items.length, reduce ? 1 : 5 + Math.random() * 3)}deg)`;
    // O giro dura o que a transição do CSS disser
    await (reduce ? new Promise(resolve => setTimeout(resolve, REDUCED_PAUSE_MS)) : afterAnimations(wheel));

    center.innerHTML = STAR_ICON;
    const winnerBox = document.getElementById('roulette-winner');
    winnerBox.textContent = `Hoje é dia de: ${winner}`;
    winnerBox.hidden = false;
    spinning = false;
    updateRouletteControls();
    createConfetti();

    grantXp('roulette');
    trackChallenge('roulette');
    if (isGuest()) {
        session.user.rouletteWins = (session.user.rouletteWins || 0) + 1;
        saveGuestWins(session.user.rouletteWins);
    } else if (session.currentUserId) {
        const result = await supabaseIncrementRouletteWins(session.currentUserId);
        if (result.success) {
            session.user.rouletteWins = result.wins;
        }
    }

    await checkAllBadges();
}

async function limparRoleta() {
    if (spinning || state.rouletteItems.length === 0) return;
    if (await confirmDialog({ title: 'Limpar roleta', message: 'Deseja limpar toda a lista da roleta?', confirmLabel: 'Limpar', danger: true })) {
        state.rouletteItems = [];
        renderRoleta();
        showToast("Lista limpa!");
    }
}

// Volta ao início sem animar; o reflow aplica o giro antes de reativar a transição
function resetWheel() {
    const wheel = document.getElementById('roulette-wheel');
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    void wheel.offsetWidth;
    wheel.style.transition = '';
}

function updateRouletteControls() {
    const count = state.rouletteItems.length;
    document.getElementById('btn-girar').disabled = spinning || count < 2;
    document.getElementById('btn-limpar-roleta').hidden = count === 0;
    document.getElementById('roulette-hint').hidden = count >= 2;
}

registerActions({
    click: {
        addCurrentToRoulette,
        goToRoulette,
        addRoletaItem,
        girarRoleta,
        limparRoleta,
        removeRoletaItem: el => removeRoletaItem(Number(el.dataset.arg)),
    },
    enter: {
        addRoletaItem,
    },
});
