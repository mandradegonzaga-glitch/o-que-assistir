// Modais acessíveis (foco, trap, Esc) e o diálogo de confirmação do app
import { initSheets, resetSheet } from './sheet.js';
import { registerActions } from './actions.js';
import { afterAnimations } from './motion.js';

// Como cada janela fecha de verdade. Sem registro, só some (closeModal).
// Ex.: a página do título também para o trailer; o onboarding grava que já foi visto.
const closers = new Map();

export function onModalClose(id, close) {
    closers.set(id, close);
}

function hide(modal) {
    const close = closers.get(modal.id);
    if (close) close();
    else closeModal(modal.id);
}

// Toda janela abre e fecha por aqui: foco preso, fundo inerte e a pilha de abertas ficam certos
export function openModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = 'flex';
    onModalOpened(modal);
    return modal;
}

// Fecha na hora (respostas do app); fechar pela pessoa é closeModalWithAnimation
export function closeModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = 'none';
    onModalClosed(modal);
}

export const isModalOpen = id => openModals.some(modal => modal.id === id);

window.addEventListener('click', (e) => {
    if (e.target.classList?.contains('modal-overlay')) {
        closeModalWithAnimation(e.target);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Só o diálogo do topo: com a confirmação aberta sobre o perfil, Esc não fecha os dois.
        // Um que já está saindo (animação de fechar) não conta: o Esc vale para o de baixo.
        const top = [...openModals].reverse().find(m => !m.classList.contains('is-closing'));
        if (top?.classList.contains('modal-overlay')) closeModalWithAnimation(top);
        // Login, por exemplo, não fecha com Esc: só quem registrou como fechar
        else if (top && closers.has(top.id)) hide(top);
    }

    if (e.key === 'Tab') trapFocusInModal(e);
});

// Fechar pela pessoa (tocar fora, Esc, "Fechar", arrastar): a janela sai antes de sumir.
// No celular a gaveta desce (sai pelo mesmo caminho por onde entrou); no computador, esmaece.
// A saída (classe is-closing) e a duração dela estão no CSS.
export async function closeModalWithAnimation(modal) {
    if (!modal || !openModals.includes(modal) || modal.classList.contains('is-closing')) return;
    // Tira o que o arraste deixou no elemento: a saída continua de onde o dedo largou
    resetSheet(modal);
    modal.classList.add('is-closing');
    await afterAnimations(modal);
    modal.classList.remove('is-closing');
    hide(modal);
}

// ================================================
// MODAIS ACESSÍVEIS — foco, trap e retorno
// ================================================

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, summary, [tabindex]:not([tabindex="-1"])';

// Pilha: o último é o modal ativo
const openModals = [];

export function getActiveModal() {
    return openModals[openModals.length - 1] || null;
}

function getFocusableIn(container) {
    // tabIndex >= 0: abas/radios inativos (tabindex -1, "roving") ficam fora da ordem do Tab
    return [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
        .filter(el => el.offsetParent !== null && !el.closest('[hidden]') && el.tabIndex >= 0);
}

function onModalOpened(modal) {
    if (openModals.includes(modal)) return;
    const opener = document.activeElement;
    modal._opener = opener && opener !== document.body ? opener : null;
    openModals.push(modal);
    document.querySelector('.container')?.setAttribute('inert', '');
    const dialog = modal.querySelector('[role="dialog"], [role="alertdialog"]') || modal;
    dialog.focus({ preventScroll: true });
}

function onModalClosed(modal) {
    const idx = openModals.indexOf(modal);
    if (idx === -1) return;
    openModals.splice(idx, 1);
    if (openModals.length === 0) {
        document.querySelector('.container')?.removeAttribute('inert');
    }
    const next = getActiveModal();
    const target = modal._opener;
    modal._opener = null;
    if (next) {
        // Volta ao botão que abriu este diálogo se ele estiver no diálogo de baixo (ex.: "Limpar tudo" no perfil)
        if (target && target.isConnected && next.contains(target)) target.focus({ preventScroll: true });
        else (next.querySelector('[role="dialog"], [role="alertdialog"]') || next).focus({ preventScroll: true });
    } else if (target && target.isConnected && !target.closest('[inert]')) {
        target.focus({ preventScroll: true });
    }
}

function trapFocusInModal(e) {
    const modal = getActiveModal();
    if (!modal) return;
    const focusables = getFocusableIn(modal);
    if (focusables.length === 0) { e.preventDefault(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    const outside = !modal.contains(current) || current.getAttribute('role') === 'dialog';
    if (e.shiftKey && (current === first || outside)) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && (current === last || outside)) {
        e.preventDefault();
        first.focus();
    }
}

// Foco preso, fundo inerte e, no celular, janelas que viram gavetas (sheet.js)
export function initModalA11y() {
    initSheets({ onDismiss: closeModalWithAnimation });
    // O login já nasce visível pelo CSS, sem passar por openModal: registrar como aberto
    const login = document.getElementById('login-overlay');
    if (login && getComputedStyle(login).display !== 'none') onModalOpened(login);
}

// CONFIRMAÇÃO — substitui confirm() nativo (bloqueava a página e fugia do visual/acessibilidade do app).
// Resolve true/false; Esc e clique fora contam como "cancelar".

export function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    okBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;
    okBtn.className = danger ? 'btn-danger' : 'btn-main';

    return new Promise(resolve => {
        let settled = false;
        const onOk = () => finish(true);
        const onCancel = () => finish(false);
        const finish = value => {
            if (settled) return;
            settled = true;
            closers.delete('modal-confirm');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            closeModal('modal-confirm');
            resolve(value);
        };
        onModalClose('modal-confirm', onCancel); // Esc, tocar fora
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        openModal('modal-confirm');
        // Foco na opção menos destrutiva (padrão de alertdialog)
        setTimeout(() => cancelBtn.focus(), 0);
    });
}

registerActions({
    click: {
        closeModal: el => closeModalWithAnimation(document.getElementById(el.dataset.arg)),
    },
});
