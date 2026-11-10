// Boas-vindas na primeira visita
import { ph } from '../ui/phosphor.js';
import { TICKET_ICON } from '../ui/icons.js';
import { closeModal, onModalClose, openModal } from '../ui/modals.js';
import { registerActions } from '../ui/actions.js';
import { storage } from '../utils/storage.js';

// Os passos moram só aqui: o HTML traz a moldura e cada passo é desenhado a partir desta lista
const steps = [
    {
        icon: TICKET_ICON, // a marca do app abre as boas-vindas
        title: 'O Que Assistir?',
        desc: 'Filme, série ou dorama: o app escolhe por você'
    },
    {
        icon: ph('shuffle', { weight: 'bold' }),
        title: 'Sorteio com filtros',
        desc: 'Escolha gênero, nota, streaming e mais, e o app sorteia um título'
    },
    {
        icon: ph('roulette', { weight: 'duotone' }),
        title: 'Roleta',
        desc: 'Ponha os títulos em dúvida e deixe a roleta decidir'
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
    document.getElementById('onboarding-btn').innerText = index === steps.length - 1 ? 'Começar' : 'Próximo';
}

function finishOnboarding() {
    storage.setText('has_visited', 'true');
    closeModal('onboarding-overlay');
}

// Esc também encerra as boas-vindas
onModalClose('onboarding-overlay', finishOnboarding);

export function checkFirstVisit() {
    if (storage.getText('has_visited')) return;
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
