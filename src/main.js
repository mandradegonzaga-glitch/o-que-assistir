// Ponto de entrada: todos os módulos já foram avaliados quando este corpo roda,
// então a inicialização pode usar qualquer função ou constante sem risco de TDZ.
import { supabaseOnAuthStateChange } from './api/supabase.js';
import { initActions } from './app/actions.js';
import { initDailyPicks } from './app/dailyPicks.js';
import { checkAuth, loadUserData, loginAsGuest } from './app/auth.js';
import { offerLegacyImport, removeLegacyPasswords, showLegacyHint } from './app/legacyImport.js';
import { renderLibrary } from './app/library.js';
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
import { initTilt } from './ui/tilt.js';
import { initAccessibility, initRovingGroups, initScrollButton, initYearInputs, setupInputWrappers } from './ui/navigation.js';
import { session } from './state/appState.js';

hydrateIcons();
initActions();
initChipFilters(); // antes de qualquer valor ser posto nos filtros: as pílulas acompanham
initHomeSearch();
initPwa();
removeLegacyPasswords();
showLegacyHint();

(async () => {
  initYearInputs();
  initRovingGroups();
  await checkAuth();
  // Quem recebe um convite de Match vota direto, sem passar pela tela de entrada
  if (!session.currentUser && hasMatchInvite()) loginAsGuest();
  initModalA11y();
  initTilt();
  renderLibrary();
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
  // Sem sessão, o título do link abre depois do login (ver auth.js)
  if (session.currentUser) {
    openTitleFromUrl();
    await openFriendLinkFromUrl();
    await openSharedListFromUrl();
    offerLegacyImport();
  }
})();

// Detecta mudanças de autenticação automaticamente
supabaseOnAuthStateChange(async (event, authSession) => {
  if (event === 'SIGNED_IN' && authSession) {
    session.currentUser = authSession.user;
    session.currentUserId = authSession.user.id;
    await loadUserData();
  } else if (event === 'SIGNED_OUT') {
    session.currentUser = null;
    session.currentUserId = null;
    session.userProfile = null;
    session.user.history = [];
  }
});
