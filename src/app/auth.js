// Login, cadastro e a sessão de quem está usando o app.
// Entrar e sair passam sempre por enterAccount / enterAsGuest / endSession. Ao terminar, avisam
// 'session:started' { kind: 'account' | 'guest' } ou 'session:ended' { kind }: cada parte do app
// (progresso, amigos, provedores, indicações do dia...) carrega ou limpa o que é seu.
import { supabaseGetBlacklist, supabaseGetCurrentUser, supabaseGetPreferences, supabaseGetProfile, supabaseGetSorteioHistory, supabaseGetWatchHistory, supabaseGetWatchlist, supabaseLogin, supabaseLogout, supabaseOnAuthStateChange, supabaseRegister, supabaseResetPassword, supabaseUpdatePreferences } from '../api/supabase.js';
import { getGuestData } from './guestLibrary.js';
import { loadAccountLists, loadGuestLists } from './listStore.js';
import { useSorteioHistory } from './sorteioHistory.js';
import { isValidEmail, passwordError, passwordLevel } from '../domain/passwordStrength.js';
import { displayName } from '../domain/profileName.js';
import { isAccount, isGuest, resetSession, session } from '../state/appState.js';
import { emit } from '../state/events.js';
import { showToast } from '../ui/feedback.js';
import { closeModal, confirmDialog, openModal } from '../ui/modals.js';
import { registerActions } from '../ui/actions.js';
import { rememberPreferences, savedPreferences } from '../ui/navigation.js';

// Ao abrir o app: a sessão do Supabase ainda vale?
export async function checkAuth() {
    const user = await supabaseGetCurrentUser();
    // O aviso de login do Supabase pode ter chegado antes e já ter entrado
    if (user && user.id !== session.currentUserId) await enterAccount(user);
    else if (!session.currentUser) openModal('login-overlay');
}

// Outra aba entrou ou saiu, ou o link de confirmação de email abriu a conta
export function watchAuthChanges() {
    supabaseOnAuthStateChange(async (event, authSession) => {
        // O Supabase também avisa o login que este app acabou de fazer: não carrega tudo de novo
        if (event === 'SIGNED_IN' && authSession && authSession.user.id !== session.currentUserId) {
            await enterAccount(authSession.user);
        } else if (event === 'SIGNED_OUT' && isAccount()) {
            endSession();
        }
    });
}

async function enterAccount(user) {
    resetSession();
    session.currentUser = user;
    session.currentUserId = user.id;
    await loadUserData();
    closeModal('login-overlay');
    updateUserDisplay();
    emit('session:started', { kind: 'account' });
}

// Dados da conta. Também serve para recarregar depois de importar a lista antiga (legacyImport.js).
export async function loadUserData() {
    if (!isAccount()) return;
    const id = session.currentUserId;

    // Leituras independentes: vão juntas, e cada uma só vale se deu certo
    const [profileResult, historyResult, watchlistResult, prefsResult, sorteioResult, blacklistResult] = await Promise.all([
        supabaseGetProfile(id),
        supabaseGetWatchHistory(id),
        supabaseGetWatchlist(id),
        supabaseGetPreferences(id),
        supabaseGetSorteioHistory(id),
        supabaseGetBlacklist(id),
        loadAccountLists(),
    ]);

    if (profileResult.success) {
        session.userProfile = profileResult.profile;
        session.user.name = displayName(session.userProfile);
        session.user.email = session.userProfile.email || '';
        session.user.rouletteWins = session.userProfile.roulette_wins || 0;
    }
    if (historyResult.success) session.user.history = historyResult.history;
    if (watchlistResult.success) session.user.watchlist = watchlistResult.watchlist;
    // Tela, tipo e aba de onde a pessoa parou, em qualquer aparelho
    if (prefsResult.success && prefsResult.preferences) rememberPreferences(prefsResult.preferences);
    if (sorteioResult.success) useSorteioHistory(sorteioResult.history);
    if (blacklistResult.success) session.blacklist = blacklistResult.blacklist.map(b => b.tmdb_id);

    emit('library:changed');
}

export function enterAsGuest() {
    resetSession();
    session.currentUser = 'guest';
    session.user.name = 'Convidado';

    const saved = getGuestData();
    session.user.history = saved.history;
    session.user.watchlist = saved.watchlist;
    session.user.rouletteWins = saved.rouletteWins;
    loadGuestLists(saved.lists);
    useSorteioHistory(saved.sorteioHistory);
    session.blacklist = saved.blacklist;

    closeModal('login-overlay');
    updateUserDisplay();
    showToast('Bem-vindo(a), Convidado');
    emit('library:changed');
    emit('session:started', { kind: 'guest' });
}

// Volta à tela de entrada com a memória limpa
export function endSession() {
    if (!session.currentUser) return; // o Supabase avisa a saída que este app acabou de fazer
    const kind = isGuest() ? 'guest' : 'account';
    resetSession();
    openModal('login-overlay');
    updateUserDisplay();
    ['login-email', 'login-password', 'register-username', 'register-email', 'register-password', 'register-confirm']
        .forEach(id => { document.getElementById(id).value = ''; });
    emit('session:ended', { kind });
}

export function updateUserDisplay() {
    const displayEl = document.getElementById('user-display');
    const avatarEl = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');
    const name = isGuest() || !session.currentUser ? 'Convidado'
        : (session.userProfile ? session.user.name || 'Usuário' : 'Usuário');
    displayEl.textContent = name;
    avatarEl.textContent = isGuest() || !session.userProfile ? '?' : name[0].toUpperCase();
    logoutBtn.style.display = session.currentUser ? 'block' : 'none';
}

// FUNÇÕES DE LOGIN/CADASTRO

function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
    });
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));

    const index = tab === 'login' ? 0 : 1;
    const activeTab = document.querySelectorAll('.login-tab')[index];
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
    activeTab.setAttribute('tabindex', '0');
    document.getElementById(tab === 'login' ? 'login-form' : 'register-form').classList.add('active');
}

function checkPasswordStrength(password) {
    const bar = document.getElementById('password-strength-bar');
    if (!password) {
        bar.className = 'password-strength-bar';
        bar.style.width = '0';
        return;
    }
    bar.className = `password-strength-bar ${passwordLevel(password)}`;
}

function showFormError(errorEl, message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

async function registerUser() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorEl = document.getElementById('register-error');

    if (!username || !email || !password || !confirm) return showFormError(errorEl, 'Preencha todos os campos');
    if (!isValidEmail(email)) return showFormError(errorEl, 'Digite um email válido');
    const invalid = passwordError(password, confirm);
    if (invalid) return showFormError(errorEl, invalid);

    const result = await supabaseRegister(username, email, password);
    if (!result.success) {
        const exists = result.error.includes('already registered') || result.error.includes('already exists');
        return showFormError(errorEl, exists ? 'Este usuário já existe' : `Erro: ${result.error}`);
    }

    showToast('Conta criada com sucesso');
    await enterAccount(result.user);
}

async function loginUser() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) return showFormError(errorEl, 'Preencha todos os campos');

    const result = await supabaseLogin(email, password);
    if (!result.success) return showFormError(errorEl, 'Email ou senha incorretos');

    await enterAccount(result.user);
    showToast(`Bem-vindo(a), ${session.user.name || 'Usuário'}`);
}

async function esqueceuSenha() {
    const email = document.getElementById('login-email').value.trim();

    if (!email) {
        showToast("Digite seu email primeiro", "error");
        document.getElementById('login-email').focus();
        return;
    }

    if (!isValidEmail(email)) {
        showToast("Digite um email válido", "error");
        return;
    }

    const confirmar = await confirmDialog({
        title: 'Recuperar senha',
        message: `Enviar email de recuperação para:\n${email}`,
        confirmLabel: 'Enviar email'
    });

    if (!confirmar) return;

    showToast("Enviando email...");

    const result = await supabaseResetPassword(email);

    if (result.success) {
        showToast("Email enviado! Verifique sua caixa de entrada.");
    } else if (result.error.includes('rate limit')) {
        showToast("Muitas tentativas. Aguarde alguns minutos.", "error");
    } else {
        showToast("Se o email existir, você receberá as instruções.");
    }
}

async function logout() {
    const sair = await confirmDialog({ title: 'Sair da conta', message: 'Deseja realmente sair?', confirmLabel: 'Sair' });
    if (!sair) return;
    if (isAccount()) {
        // Tela, tipo e aba ficam na conta para o próximo aparelho
        await supabaseUpdatePreferences(session.currentUserId, savedPreferences());
        await supabaseLogout();
    }
    endSession();
    showToast('Até logo');
}

registerActions({
    click: {
        esqueceuSenha,
        loginAsGuest: enterAsGuest,
        loginUser,
        logout,
        registerUser,
        switchLoginTab: el => switchLoginTab(el.dataset.arg),
    },
    input: {
        checkPasswordStrength: el => checkPasswordStrength(el.value),
    },
});
