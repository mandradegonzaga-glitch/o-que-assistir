// Abas, tipo de conteúdo, atalhos, gestos e utilitários de campo
import { renderLibrary } from '../app/library.js';
import { renderMatchHistory } from '../app/matchHistory.js';
import { syncUrl } from '../app/urlSync.js';
import { state } from '../state/appState.js';
import { isHorizontalSwipe } from '../domain/gestures.js';
import { closeModalWithAnimation, getActiveModal } from './modals.js';
import { SHEET_QUERY } from './sheet.js';

// NAVEGAÇÃO

export const VIEWS = ['discover', 'roulette', 'match', 'library'];

export function switchMode(mode) {
    if (!VIEWS.includes(mode)) mode = 'discover';
    document.querySelectorAll('.mode-tab').forEach(el => {
        el.classList.remove('active');
        el.setAttribute('aria-selected', 'false');
        el.setAttribute('tabindex', '-1');
    });
    // Localiza a aba pelo modo (não usa o `event` global: funciona por clique, teclado ou código)
    const activeTab = document.querySelector(`.mode-tab[aria-controls="view-${mode}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        activeTab.setAttribute('tabindex', '0');
    }

    const changed = document.getElementById(`view-${mode}`)?.style.display !== 'block';
    VIEWS.forEach(view => {
        document.getElementById(`view-${view}`).style.display = mode === view ? 'block' : 'none';
    });

    // Barra de baixo (celular): marca a tela atual
    document.querySelectorAll('.bottom-nav__item').forEach(item => {
        if (item.dataset.arg === mode) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });
    // Trocar de tela pela barra começa do alto, como num app
    if (changed && document.activeElement?.closest('.bottom-nav')) window.scrollTo({ top: 0 });

    if (mode === 'match') renderMatchHistory();

    // Salvar preferência
    localStorage.setItem('last_mode', mode);
    syncUrl();
}

// NAVEGAÇÃO POR SETAS (tabs e radiogroups com tabindex "roving")
// Só o item ativo fica no Tab; setas/Home/End movem o foco e ativam o item.

export function initRovingGroups() {
    document.addEventListener('keydown', (e) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (!keys.includes(e.key)) return;
        const current = e.target.closest('[role="tab"], [role="radio"]');
        const group = current?.closest('[role="tablist"], [role="radiogroup"]');
        if (!group) return;
        const items = [...group.querySelectorAll('[role="tab"], [role="radio"]')]
            .filter(el => el.offsetParent !== null);
        const idx = items.indexOf(current);
        if (idx === -1) return;
        e.preventDefault();
        let next;
        if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = items.length - 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + items.length) % items.length;
        else next = (idx + 1) % items.length;
        items[next].focus();
        items[next].click();
    });
}

export function selecionarTipo(t) {
    state.type = t;

    // Update visual and accessibility states
    ['movie', 'tv', 'dorama'].forEach(type => {
        const btn = document.getElementById(`btn-${type}`);
        const isSelected = t === type;
        btn.className = `card ${isSelected ? 'selected' : ''}`;
        btn.setAttribute('aria-checked', isSelected);
        btn.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    // Apply theme based on content type
    document.body.setAttribute('data-theme', t);

    // Dorama já é coreano: o filtro de país não se aplica
    const country = document.getElementById('input-country');
    if (country) {
        country.disabled = t === 'dorama';
        document.getElementById('hint-country').hidden = t !== 'dorama';
    }

    // Salvar preferência
    localStorage.setItem('last_type', t);
    syncUrl();
}

export function switchTab(t) {
    state.tab = t;

    const tabs = {
        watchlist: document.getElementById('tab-watchlist'),
        andando:   document.getElementById('tab-andando'),
        vistos:    document.getElementById('tab-vistos'),
        listas:    document.getElementById('tab-listas'),
    };

    Object.entries(tabs).forEach(([key, el]) => {
        if (!el) return;
        const active = key === t;
        el.setAttribute('aria-selected', active ? 'true' : 'false');
        el.setAttribute('tabindex', active ? '0' : '-1');
    });

    document.getElementById('library-content')?.setAttribute('aria-labelledby', `tab-${t}`);
    localStorage.setItem('last_library_tab', t);
    renderLibrary();
}

// UTILITY FUNCTIONS

export function clearInput(inputId) {
    const input = document.getElementById(inputId);
    input.value = '';
    input.focus();
    const wrapper = input.closest('.input-wrapper');
    if (wrapper) wrapper.classList.remove('has-value');

    if (inputId === 'actor-input') {
        document.getElementById('actor-list').style.display = 'none';
    }
}

export function toggleClearButton(input) {
    const wrapper = input.closest('.input-wrapper');
    if (wrapper) {
        if (input.value.length > 0) {
            wrapper.classList.add('has-value');
        } else {
            wrapper.classList.remove('has-value');
        }
    }
}

export function setupInputWrappers() {
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', function() {
            toggleClearButton(this);
        });
    });
}

// ACCESSIBILITY INIT

export function initAccessibility() {
    // Restore last preferences
    const lastMode = localStorage.getItem('last_mode');
    const lastType = localStorage.getItem('last_type') || 'movie';
    const lastTab = localStorage.getItem('last_library_tab');

    if (lastMode && lastMode !== 'discover') {
        switchMode(lastMode);
    }

    // Always apply the theme (default to movie if not set)
    selecionarTipo(lastType);

    if (lastTab && lastTab !== 'watchlist') {
        switchTab(lastTab);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K para focar na busca
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('direct-search').focus();
        }

        // Ctrl/Cmd + S para sortear
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const btn = document.getElementById('btn-sortear');
            if (btn && !btn.disabled) btn.click();
        }
    });
}

// MOBILE GESTURES

let touchStart = null;

// Áreas que rolam para o lado (elenco, por exemplo) usam o gesto para rolar
function scrollsSideways(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
        const overflow = getComputedStyle(el).overflowX;
        if ((overflow === 'auto' || overflow === 'scroll') && el.scrollWidth > el.clientWidth) return true;
    }
    return false;
}

document.addEventListener('touchstart', (e) => {
    const { screenX, screenY } = e.changedTouches[0];
    touchStart = { x: screenX, y: screenY, ignore: scrollsSideways(e.target) };
});

document.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const { screenX, screenY } = e.changedTouches[0];
    const { x, y, ignore } = touchStart;
    touchStart = null;
    if (!ignore && isHorizontalSwipe(screenX - x, screenY - y)) handleSwipe();
});

export function handleSwipe() {
    // No celular as janelas são gavetas: entram por baixo e fecham puxando para baixo (sheet.js).
    // Deslizar para o lado fecharia por um caminho que a janela nunca fez.
    if (window.matchMedia(SHEET_QUERY).matches) return;
    // Fecha só o diálogo do topo
    const modal = getActiveModal();
    if (modal?.classList.contains('modal-overlay')) closeModalWithAnimation(modal);
}

// FILTRO DE ANO — limite máximo acompanha o ano atual

export function initYearInputs() {
    const currentYear = String(new Date().getFullYear());
    ['year-from', 'year-to'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.max = currentYear;
    });
}

// SCROLL TO TOP

export function initScrollButton() {
    const scrollBtn = document.getElementById('scroll-top');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
}

export function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
