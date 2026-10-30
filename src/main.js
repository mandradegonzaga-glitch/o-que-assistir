// Ponto de entrada: todos os módulos já foram avaliados quando este corpo roda,
// então a inicialização pode usar qualquer função ou constante sem risco de TDZ.
import { supabaseOnAuthStateChange } from './api/supabase.js';
import { initActions } from './app/actions.js';
import { checkAuth, loadUserData } from './app/auth.js';
import { renderLibrary } from './app/library.js';
import { checkFirstVisit } from './app/onboarding.js';
import { initPwa } from './app/pwa.js';
import { initUrlState, openTitleFromUrl } from './app/urlSync.js';
import { initModalA11y } from './ui/modals.js';
import { initAccessibility, initRovingGroups, initScrollButton, initYearInputs, setupInputWrappers } from './ui/navigation.js';
import { session } from './state/appState.js';

initActions();
initPwa();

(async () => {
  initYearInputs();
  initRovingGroups();
  await checkAuth();
  initModalA11y();
  renderLibrary();
  initAccessibility();
  initUrlState();
  setupInputWrappers();
  checkFirstVisit();
  initScrollButton();
  // Sem sessão, o título do link abre depois do login (ver auth.js)
  if (session.currentUser) openTitleFromUrl();
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
