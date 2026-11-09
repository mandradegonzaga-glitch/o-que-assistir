// Abas, tipo de conteúdo, atalhos, gestos e utilitários de campo
import { state } from '../state/appState.js';
import { emit } from '../state/events.js';
import { isHorizontalSwipe } from '../domain/gestures.js';
import { closeModalWithAnimation, getActiveModal } from './modals.js';
import { SHEET_QUERY } from './sheet.js';
import { MEDIA_TYPES } from '../domain/mediaItem.js';
import { registerActions } from './actions.js';

// Onde a pessoa parou (tela, tipo, aba): fica no aparelho e, com conta, também no Supabase (auth.js)
const PREFERENCE_DEFAULTS = { last_mode: 'discover', last_type: 'movie', last_library_tab: 'watchlist' };

export function savedPreferences() {
    return Object.fromEntries(Object.entries(PREFERENCE_DEFAULTS)
        .map(([key, fallback]) => [key, localStorage.getItem(key) || fallback]));
}

export function rememberPreferences(prefs) {
    Object.keys(PREFERENCE_DEFAULTS).forEach(key => {
        if (prefs[key]) localStorage.setItem(key, prefs[key]);
    });
}

// NAVEGAÇÃO

const VIEWS = ['discover', 'roulette', 'match', 'library'];

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

    const changed = state.mode !== mode;
    state.mode = mode;
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

    localStorage.setItem('last_mode', mode);
    emit('mode:changed', { mode });
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
    MEDIA_TYPES.forEach(type => {
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

    localStorage.setItem('last_type', t);
    emit('type:changed', { type: t });
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
    return emit('tab:changed', { tab: t });
}

// UTILITY FUNCTIONS

function clearInput(inputId) {
    const input = document.getElementById(inputId);
    input.value = '';
    input.focus();
    // Quem escuta o campo (sugestões de ator, URL) reage como se a pessoa tivesse apagado
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function toggleClearButton(input) {
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
    const { last_mode: lastMode, last_type: lastType, last_library_tab: lastTab } = savedPreferences();

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

function handleSwipe() {
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

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

registerActions({
    click: {
        clearInput: el => clearInput(el.dataset.arg),
        scrollToTop,
        selecionarTipo: el => selecionarTipo(el.dataset.arg),
        switchMode: el => switchMode(el.dataset.arg),
        switchTab: el => switchTab(el.dataset.arg),
        // Do atalho no Início para a aba: sobe depois que a aba desenhou
        switchTabAndTop: async el => {
            await switchTab(el.dataset.arg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
    },
});
