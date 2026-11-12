// Primeira visita (repasse da etapa 5d; referência: conceito "Press Play Sooner", da Mondaysys): uma
// tela só, com os serviços que a pessoa assina e os gêneros que curte. Tudo opcional: "Pular" não
// guarda nada. Os serviços vão para "Minhas plataformas" (src/app/myProviders.js) e os gêneros guiam
// as Indicações do dia até o DNA se formar (src/app/tasteSeed.js).
import { featuredProviderLogos } from '../api/providerLogos.js';
import { IMG_URL } from '../config/constants.js';
import { GENRE_NAMES, MAIN_GENRE_IDS } from '../domain/genres.js';
import { FEATURED_PROVIDERS } from '../domain/providers.js';
import { closeModal, onModalClose, openModal } from '../ui/modals.js';
import { registerActions } from '../ui/actions.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { storage } from '../utils/storage.js';
import { setMyProviders } from './myProviders.js';
import { setTasteSeed } from './tasteSeed.js';

const SERVICES = FEATURED_PROVIDERS.slice(0, 8);
const OPEN_DELAY_MS = 500; // depois de a tela de entrada aparecer, não junto com ela

const choiceHtml = (cls, id, label, i, inner = escapeHtml(label)) =>
  `<button type="button" class="${cls}" style="--i:${i}" aria-pressed="false" aria-label="${escapeHtml(label)}" data-action="toggleOnboardingChoice" data-id="${id}">${inner}</button>`;

function renderChoices() {
  document.getElementById('onboarding-services').innerHTML = SERVICES
    .map((p, i) => choiceHtml('onboarding-service', p.id, p.name, i)).join('');
  document.getElementById('onboarding-genres').innerHTML = MAIN_GENRE_IDS
    .map((id, i) => choiceHtml('onboarding-genre', id, GENRE_NAMES[id], i)).join('');
  // Logos chegam depois; até lá, os nomes
  featuredProviderLogos().then(logos => {
    document.querySelectorAll('.onboarding-service').forEach(button => {
      const logo = logos.get(button.dataset.id);
      if (logo) button.innerHTML = `<img src="${IMG_URL + logo}" alt="" width="56" height="56">`;
    });
  });
}

const chosen = cls => [...document.querySelectorAll(`.${cls}[aria-pressed="true"]`)].map(b => b.dataset.id);

function toggleOnboardingChoice(button) {
  button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
}

function closeOnboarding() {
  storage.setText('has_visited', 'true');
  closeModal('onboarding-overlay');
}

// Esc também encerra, sem guardar as escolhas
onModalClose('onboarding-overlay', () => storage.setText('has_visited', 'true'));

function continueOnboarding() {
  const services = chosen('onboarding-service');
  const genres = chosen('onboarding-genre').map(Number);
  if (services.length) setMyProviders(services);
  if (genres.length) setTasteSeed(genres);
  closeOnboarding();
}

export function checkFirstVisit() {
  if (storage.getText('has_visited')) return;
  renderChoices();
  setTimeout(() => openModal('onboarding-overlay'), OPEN_DELAY_MS);
}

registerActions({
  click: {
    continueOnboarding,
    skipOnboarding: closeOnboarding,
    toggleOnboardingChoice,
  },
});
