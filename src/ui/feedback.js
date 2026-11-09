// Avisos: toast, "Desfazer" e confete
import { BADGE_ICONS } from './badgeIcons.js';
import { registerActions } from './actions.js';
import { prefersReducedMotion } from './motion.js';

// DESFAZER — remoção adiada: a interface tira o item na hora e a gravação definitiva só roda
// depois de UNDO_MS (ou antes, se outra remoção começar ou a página fechar).
// "Desfazer"/Ctrl+Z cancela a gravação e restaura o item.
//
// scheduleUndoable({ message, hide, apply, undo, commit, after, focusAfter })
//   hide: chave do item ('blacklist:123'), escondido de quem redesenha (isPendingRemoval) até o
//         commit terminar ou o desfazer; o prefixo é o nome da lista, para não colidir
//   apply: tira da tela; devolve true se o foco estava no item
//   commit: grava de vez; after: redesenha quando o item já não está mais escondido

const UNDO_MS = 5000;
let pendingUndo = null;
const hiddenItems = new Set();

export const isPendingRemoval = key => hiddenItems.has(key);

export function scheduleUndoable({ message, hide, apply, undo, commit, after, focusAfter }) {
    flushPendingUndo();
    if (hide) hiddenItems.add(hide);
    const hadFocus = apply();
    const entry = { hide, commit, after, undo, focusAfter };
    entry.timer = setTimeout(() => {
        if (pendingUndo !== entry) return;
        pendingUndo = null;
        hideUndoToast(entry);
        finish(entry);
    }, UNDO_MS);
    pendingUndo = entry;
    showUndoToast(message, hadFocus);
}

async function finish(entry) {
    await entry.commit();
    if (entry.hide) hiddenItems.delete(entry.hide);
    entry.after?.();
}

function flushPendingUndo() {
    if (!pendingUndo) return;
    const entry = pendingUndo;
    pendingUndo = null;
    clearTimeout(entry.timer);
    hideUndoToast(entry);
    finish(entry);
}

function undoLast() {
    if (!pendingUndo) return false;
    const entry = pendingUndo;
    pendingUndo = null;
    clearTimeout(entry.timer);
    const wasOnButton = document.activeElement?.id === 'undo-toast-btn';
    document.getElementById('undo-toast').hidden = true;
    if (entry.hide) hiddenItems.delete(entry.hide);
    entry.undo(wasOnButton);
    showToast('Remoção desfeita');
    return true;
}

function showUndoToast(message, moveFocus) {
    const box = document.getElementById('undo-toast');
    document.getElementById('undo-toast-msg').textContent = message;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('show'));
    // Quem removeu pelo teclado perde o foco junto com o item: leva o foco para "Desfazer"
    if (moveFocus) document.getElementById('undo-toast-btn').focus();
}

function hideUndoToast(entry) {
    const box = document.getElementById('undo-toast');
    const wasOnButton = document.activeElement?.id === 'undo-toast-btn';
    box.classList.remove('show');
    box.hidden = true;
    if (wasOnButton) entry?.focusAfter?.()?.focus();
}

// Ctrl/Cmd+Z desfaz a última remoção (fora de campos de texto, onde Ctrl+Z é do próprio campo)

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && pendingUndo
        && !e.target.closest('input, textarea, [contenteditable="true"]')) {
        e.preventDefault();
        undoLast();
    }
});

// Fechar/recarregar a aba antes do prazo: tenta gravar a remoção pendente

window.addEventListener('pagehide', flushPendingUndo);

// A entrada e a saída são a transição do .toast no CSS. Um aviso novo reinicia a contagem:
// antes, o cronômetro do aviso anterior escondia o novo antes da hora.
let toastTimer = null;
export function showToast(msg, type="success") {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.className = `toast show ${type}`;
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

export function createConfetti() {
    if (prefersReducedMotion()) return;
    const colors = ['#ffc94d', '#3dd6c6', '#ff8fb8', '#9d8cff', '#ff9f5a'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animation = `confetti-fall ${2 + Math.random() * 2}s linear forwards`;
            confetti.style.animationDelay = Math.random() * 0.5 + 's';

            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 4000);
        }, i * 30);
    }
}

// Bilhete de conquista: momento próprio para o desbloqueio, sem interromper o que a pessoa faz.
// Fila: avisos que chegam juntos (ex.: conquista + desafio do dia) aparecem um depois do outro, em vez
// de o segundo apagar o primeiro. A conquista vem antes, depois o nível, depois desafio e meta.
const ACHIEVEMENT_MS = 5000;
const ACHIEVEMENT_GAP_MS = 350;
const priorityOf = kicker => (kicker === 'Conquista desbloqueada' ? 0 : kicker === 'Novo nível' ? 1 : 2);
const achievementQueue = [];
let achievementTimer;
let achievementBusy = false;
let achievementScheduled = false;

function showNextAchievement() {
    achievementScheduled = false;
    if (achievementBusy || achievementQueue.length === 0) return;
    achievementQueue.sort((a, b) => a.priority - b.priority || a.order - b.order);
    const { name, desc, icon, kicker } = achievementQueue.shift();
    achievementBusy = true;
    document.querySelector('.achievement__kicker').textContent = kicker;
    document.getElementById('achievement-icon').innerHTML = BADGE_ICONS[icon] || '';
    document.getElementById('achievement-name').textContent = name;
    document.getElementById('achievement-desc').textContent = desc;
    const box = document.getElementById('achievement');
    box.hidden = false;
    box.classList.remove('show');
    requestAnimationFrame(() => box.classList.add('show'));
    createConfetti();
    clearTimeout(achievementTimer);
    achievementTimer = setTimeout(() => {
        box.classList.remove('show');
        box.hidden = true;
        achievementBusy = false;
        if (achievementQueue.length) setTimeout(showNextAchievement, ACHIEVEMENT_GAP_MS);
    }, ACHIEVEMENT_MS);
}

let achievementOrder = 0;
export function showAchievement({ name, desc, icon, kicker = 'Conquista desbloqueada' }) {
    achievementQueue.push({ name, desc, icon, kicker, priority: priorityOf(kicker), order: achievementOrder++ });
    // Espera o fim da tarefa atual: assim avisos disparados juntos entram na fila antes de escolher o primeiro
    if (!achievementBusy && !achievementScheduled) {
        achievementScheduled = true;
        setTimeout(showNextAchievement, 0);
    }
}

registerActions({
    click: {
        undoLast,
    },
});
