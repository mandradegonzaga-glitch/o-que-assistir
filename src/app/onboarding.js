// Boas-vindas na primeira visita


// ONBOARDING SYSTEM

export let onboardingStep = 0;

export const onboardingSteps = [
    {
        icon: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" fill-opacity="0.2" d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2.5a1.5 1.5 0 0 0 0-3z"/><path d="M16 6v2M16 11v2M16 16v2"/><path fill="currentColor" stroke="none" d="M8 9v6l5-3z"/></svg>',
        title: 'Bem-vindo!',
        desc: 'Descubra filmes e séries de forma inteligente com filtros personalizados'
    },
    {
        icon: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect fill="currentColor" fill-opacity="0.2" x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle fill="currentColor" stroke="none" cx="8.2" cy="8.2" r="1.4"/><circle fill="currentColor" stroke="none" cx="15.8" cy="8.2" r="1.4"/><circle fill="currentColor" stroke="none" cx="12" cy="12" r="1.4"/><circle fill="currentColor" stroke="none" cx="8.2" cy="15.8" r="1.4"/><circle fill="currentColor" stroke="none" cx="15.8" cy="15.8" r="1.4"/></svg>',
        title: 'Sorteio Inteligente',
        desc: 'Use filtros avançados e deixe o algoritmo escolher a melhor opção para você'
    },
    {
        icon: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle fill="currentColor" fill-opacity="0.2" cx="12" cy="13.5" r="8.5"/><path d="M12 13.5V5M12 13.5l7.4 4.2M12 13.5l-7.4 4.2"/><circle fill="currentColor" stroke="none" cx="12" cy="13.5" r="1.7"/><path fill="currentColor" stroke="none" d="M12 6 9.6 1.5h4.8z"/></svg>',
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
