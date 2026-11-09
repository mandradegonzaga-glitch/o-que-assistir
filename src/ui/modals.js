// Modais acessíveis (foco, trap, Esc) e o diálogo de confirmação do app
import { initSheets, resetSheet } from './sheet.js';
import { registerActions } from './actions.js';
import { afterAnimations } from './motion.js';

// Como cada janela fecha de verdade. Sem registro, só some (display none).
// Ex.: a página do título também para o trailer; o onboarding grava que já foi visto.
const closers = new Map();

export function onModalClose(id, close) {
    closers.set(id, close);
}

function hide(modal) {
    const close = closers.get(modal.id);
    if (close) close();
    else modal.style.display = 'none';
}

// Event listeners

window.addEventListener('click', (e) => {
    if (e.target.classList?.contains('modal-overlay')) {
        closeModalWithAnimation(e.target);
    }
});

// KEYBOARD SUPPORT

document.addEventListener('keydown', (e) => {
    // ESC fecha modais
    if (e.key === 'Escape') {
        // Só o diálogo do topo: com a confirmação aberta sobre o perfil, Esc não fecha os dois.
        // Um que já está saindo (animação de fechar) não conta: o Esc vale para o de baixo.
        const top = [...openModals].reverse().find(m => !m.classList.contains('is-closing'));
        if (top?.classList.contains('modal-overlay')) closeModalWithAnimation(top);
        // Login, por exemplo, não fecha com Esc: só quem registrou como fechar
        else if (top && closers.has(top.id)) hide(top);
    }

    // TAB preso dentro do modal aberto
    if (e.key === 'Tab') trapFocusInModal(e);
});

// Fechar pela pessoa (tocar fora, Esc, "Fechar", arrastar): a janela sai antes de sumir.
// No celular a gaveta desce (sai pelo mesmo caminho por onde entrou); no computador, esmaece.
// A saída (classe is-closing) e a duração dela estão no CSS. Fechamentos automáticos do app
// continuam com style.display = 'none' direto (resposta do sistema não espera animação).
export async function closeModalWithAnimation(modal) {
    if (!modal || modal.style.display !== 'flex' || modal.classList.contains('is-closing')) return;
    // Tira o que o arraste deixou no elemento: a saída continua de onde o dedo largou
    resetSheet(modal);
    modal.classList.add('is-closing');
    await afterAnimations(modal);
    modal.classList.remove('is-closing');
    hide(modal);
}

// ================================================
// MODAIS ACESSÍVEIS — foco, trap e retorno
// Os modais abrem/fecham via style.display em vários pontos;
// um MutationObserver centraliza o comportamento sem tocar em cada um.
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
    const observer = new MutationObserver(mutations => {
        mutations.forEach(({ target: modal }) => {
            if (modal.style.display === 'flex') onModalOpened(modal);
            else if (modal.style.display === 'none') onModalClosed(modal);
        });
    });
    // Login e onboarding também são diálogos: mesmo foco preso e fundo inerte
    document.querySelectorAll('.modal-overlay, .login-overlay, .onboarding-overlay').forEach(modal => {
        observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
        // O login já nasce visível pelo CSS (sem style inline): registrar como aberto
        if (getComputedStyle(modal).display !== 'none') onModalOpened(modal);
    });
}

// CONFIRMAÇÃO — substitui confirm() nativo (bloqueava a página e fugia do visual/acessibilidade do app).
// Resolve true/false; Esc e clique fora contam como "cancelar". O foco/trap vêm de initModalA11y().

export function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
    const overlay = document.getElementById('modal-confirm');
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
            observer.disconnect();
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            if (overlay.style.display !== 'none') overlay.style.display = 'none';
            resolve(value);
        };
        const observer = new MutationObserver(() => {
            if (overlay.style.display === 'none') finish(false);
        });
        observer.observe(overlay, { attributes: true, attributeFilter: ['style'] });
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        overlay.style.display = 'flex';
        // Foco na opção menos destrutiva (padrão de alertdialog)
        setTimeout(() => cancelBtn.focus(), 0);
    });
}

registerActions({
    click: {
        closeModal: el => closeModalWithAnimation(document.getElementById(el.dataset.arg)),
    },
});
