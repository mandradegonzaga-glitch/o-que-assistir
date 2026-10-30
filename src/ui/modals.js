// Modais acessíveis (foco, trap, Esc) e o diálogo de confirmação do app
import { skipOnboarding } from '../app/onboarding.js';
import { fecharModal } from '../app/titleModal.js';

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
        // Só o diálogo do topo: com a confirmação aberta sobre o perfil, Esc não fecha os dois
        const top = getActiveModal();
        if (top?.classList.contains('modal-overlay')) {
            closeModalWithAnimation(top);
        } else if (top?.id === 'onboarding-overlay') {
            skipOnboarding();
        }
    }

    // TAB preso dentro do modal aberto
    if (e.key === 'Tab') trapFocusInModal(e);
});

export function closeModalWithAnimation(modal) {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        modal.style.animation = '';
        if(modal.id === 'modal-resultado') {
            fecharModal(); // também limpa trailer e estado de episódios
        } else {
            modal.style.display = 'none';
        }
    }, 300);
}

// ================================================
// MODAIS ACESSÍVEIS — foco, trap e retorno
// Os modais abrem/fecham via style.display em vários pontos;
// um MutationObserver centraliza o comportamento sem tocar em cada um.
// ================================================

export const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, summary, [tabindex]:not([tabindex="-1"])';

export const openModals = [];

// pilha: o último é o modal ativo


export function getActiveModal() {
    return openModals[openModals.length - 1] || null;
}

export function getFocusableIn(container) {
    // tabIndex >= 0: abas/radios inativos (tabindex -1, "roving") ficam fora da ordem do Tab
    return [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
        .filter(el => el.offsetParent !== null && !el.closest('[hidden]') && el.tabIndex >= 0);
}

export function onModalOpened(modal) {
    if (openModals.includes(modal)) return;
    const opener = document.activeElement;
    modal._opener = opener && opener !== document.body ? opener : null;
    openModals.push(modal);
    document.querySelector('.container')?.setAttribute('inert', '');
    const dialog = modal.querySelector('[role="dialog"], [role="alertdialog"]') || modal;
    dialog.focus({ preventScroll: true });
}

export function onModalClosed(modal) {
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

export function trapFocusInModal(e) {
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

export function initModalA11y() {
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
