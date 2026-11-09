// Ponto de entrada: todos os módulos já foram avaliados quando este corpo roda,
// então a inicialização pode usar qualquer função ou constante sem risco de TDZ.
import { initActions } from './ui/actions.js';
// Partes do app que nenhum outro módulo importa: carregar já registra suas ações e escutas
import './app/battle.js';
import './app/blindSession.js';
import './app/help.js';
import './app/homeRows.js';
import './app/reactions.js';
import './app/ticket.js';
import { initDailyPicks } from './app/dailyPicks.js';
import { checkAuth, enterAsGuest, watchAuthChanges } from './app/auth.js';
import { offerLegacyImport, removeLegacyPasswords, showLegacyHint } from './app/legacyImport.js';
import { openFriendLinkFromUrl } from './app/friends.js';
import { openSharedListFromUrl } from './app/listShare.js';
import { hasMatchInvite, initMatch, openMatchFromUrl } from './app/match.js';
import { initMyProviders } from './app/myProviders.js';
import { checkFirstVisit } from './app/onboarding.js';
import { initPwa } from './app/pwa.js';
import { initRoulette } from './app/roulette.js';
import { initUrlState, openTitleFromUrl } from './app/urlSync.js';
import { initModalA11y } from './ui/modals.js';
import { hydrateIcons } from './ui/phosphor.js';
import { initChipFilters, refreshMoreFilters } from './ui/chipFilters.js';
import { initHomeSearch } from './app/discover.js';
import { initFilters } from './app/filters.js';
import { initTilt } from './ui/tilt.js';
import { initAccessibility, initRovingGroups, initScrollButton, initYearInputs, setupInputWrappers } from './ui/navigation.js';
import { isAccount, session } from './state/appState.js';
import { on } from './state/events.js';

// O que o link pedia (título, amigo, lista) só abre depois de alguém entrar:
// nada aparece atrás da tela de entrada
async function openLinksAfterEntering() {
  openTitleFromUrl();
  await openFriendLinkFromUrl();
  await openSharedListFromUrl();
  if (isAccount()) offerLegacyImport();
}

hydrateIcons();
initActions();
initFilters();
initChipFilters();
initHomeSearch();
initPwa();
removeLegacyPasswords();
showLegacyHint();

(async () => {
  initYearInputs();
  initRovingGroups();
  await checkAuth();
  // Quem recebe um convite de Match vota direto, sem passar pela tela de entrada
  if (!session.currentUser && hasMatchInvite()) enterAsGuest();
  initModalA11y();
  initTilt();
  initAccessibility();
  initMyProviders(); // antes da URL: um link com filtro próprio vence a preferência
  initUrlState();
  refreshMoreFilters({ openIfActive: true }); // link com ator, país ou ano: "Mais filtros" já aberto
  setupInputWrappers();
  if (!hasMatchInvite()) checkFirstVisit();
  initScrollButton();
  initRoulette();
  initMatch();
  initDailyPicks();
  openMatchFromUrl();
  // Já entrou ao abrir: abre agora, com a URL lida. Quem entrar depois abre pelo aviso.
  if (session.currentUser) await openLinksAfterEntering();
  on('session:started', openLinksAfterEntering);
  watchAuthChanges();
})();
