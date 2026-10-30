// Boas-vindas na primeira visita


// ONBOARDING SYSTEM

export let onboardingStep = 0;

export const onboardingSteps = [
    {
        icon: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>',
        title: 'Bem-vindo!',
        desc: 'Descubra filmes e séries de forma inteligente com filtros personalizados'
    },
    {
        icon: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        title: 'Sorteio Inteligente',
        desc: 'Use filtros avançados e deixe o algoritmo escolher a melhor opção para você'
    },
    {
        icon: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><circle cx="12" cy="12" r="3"/></svg>',
        title: 'Roleta Personalizada',
        desc: 'Crie sua própria roleta com filmes e deixe a sorte decidir!'
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
