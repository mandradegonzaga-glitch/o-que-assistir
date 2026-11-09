// Boas-vindas na primeira visita
import { ph } from '../ui/phosphor.js';
import { TICKET_ICON } from '../ui/icons.js';
import { closeModal, onModalClose, openModal } from '../ui/modals.js';
import { registerActions } from '../ui/actions.js';

// Os passos moram só aqui: o HTML traz a moldura e cada passo é desenhado a partir desta lista
const steps = [
    {
        icon: TICKET_ICON, // a marca do app abre as boas-vindas
        title: 'Bem-vindo!',
        desc: 'Descubra filmes e séries de forma inteligente'
    },
    {
        icon: ph('shuffle', { weight: 'bold' }),
        title: 'Sorteio Inteligente',
        desc: 'Use filtros avançados e deixe o algoritmo escolher a melhor opção para você'
    },
    {
        icon: ph('roulette', { weight: 'duotone' }),
        title: 'Roleta Personalizada',
        desc: 'Crie sua própria roleta com filmes e deixe a sorte decidir!'
    },
    {
        icon: ph('sparkle', { weight: 'duotone' }),
        title: 'Tem muito mais',
        desc: 'Match em dupla, Cine-batalha, Sessão às escuras, seu DNA… Em "Como usar", no fim da página, tem o guia de tudo.'
    }
];

let current = 0;

function showStep(index) {
    current = index;
    const step = steps[index];
    document.getElementById('onboarding-icon').innerHTML = step.icon;
    document.getElementById('onboarding-title').innerText = step.title;
    document.getElementById('onboarding-desc').innerText = step.desc;
    document.querySelector('.onboarding-dots').innerHTML = steps
        .map((_, i) => `<span class="onboarding-dot${i === index ? ' active' : ''}"></span>`).join('');
    document.getElementById('onboarding-btn').innerText = index === steps.length - 1 ? 'Começar Agora!' : 'Começar';
}

function finishOnboarding() {
    localStorage.setItem('has_visited', 'true');
    closeModal('onboarding-overlay');
}

// Esc também encerra as boas-vindas
onModalClose('onboarding-overlay', finishOnboarding);

export function checkFirstVisit() {
    if (localStorage.getItem('has_visited')) return;
    showStep(0);
    setTimeout(() => {
        openModal('onboarding-overlay');
    }, 500);
}

function nextOnboarding() {
    if (current + 1 >= steps.length) finishOnboarding();
    else showStep(current + 1);
}

registerActions({
    click: {
        nextOnboarding,
    },
});
