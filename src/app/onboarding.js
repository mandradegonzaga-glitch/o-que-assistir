// Boas-vindas na primeira visita
import { ph } from '../ui/phosphor.js';
import { TICKET_ICON } from '../ui/icons.js';


// ONBOARDING SYSTEM

export let onboardingStep = 0;

export const onboardingSteps = [
    {
        icon: TICKET_ICON, // a marca do app abre as boas-vindas
        title: 'Bem-vindo!',
        desc: 'Descubra filmes e séries de forma inteligente com filtros personalizados'
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

export function checkFirstVisit() {
    const hasVisited = localStorage.getItem('has_visited');
    if (!hasVisited) {
        setTimeout(() => {
            document.getElementById('onboarding-overlay').style.display = 'flex';
        }, 500);
    }
}

export function nextOnboarding() {
    onboardingStep++;

    if (onboardingStep >= onboardingSteps.length) {
        finishOnboarding();
        return;
    }

    const step = onboardingSteps[onboardingStep];
    document.getElementById('onboarding-icon').innerHTML = step.icon;
    document.getElementById('onboarding-title').innerText = step.title;
    document.getElementById('onboarding-desc').innerText = step.desc;

    // Update dots
    document.querySelectorAll('.onboarding-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === onboardingStep);
    });

    if (onboardingStep === onboardingSteps.length - 1) {
        document.getElementById('onboarding-btn').innerText = 'Começar Agora!';
    }
}

export function finishOnboarding() {
    localStorage.setItem('has_visited', 'true');
    const overlay = document.getElementById('onboarding-overlay');
    overlay.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.animation = '';
    }, 300);
}

export function skipOnboarding() {
    finishOnboarding();
}
