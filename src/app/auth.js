// Login, cadastro, sessão e dados do usuário
import { supabaseGetBlacklist, supabaseGetCurrentUser, supabaseGetPreferences, supabaseGetProfile, supabaseGetSorteioHistory, supabaseGetWatchHistory, supabaseGetWatchlist, supabaseLogin, supabaseLogout, supabaseRegister, supabaseResetPassword, supabaseUpdatePreferences, supabaseUpdateProfile } from '../api/supabase.js';
import { renderLibrary } from './library.js';
import { updateHistoryButton } from './sorteioHistory.js';
import { openTitleFromUrl } from './urlSync.js';
import { scorePassword } from '../domain/passwordStrength.js';
import { session } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';

export async function checkAuth() {
    const user = await supabaseGetCurrentUser();

    if (user) {
        session.currentUser = user;
        session.currentUserId = user.id;
        await loadUserData();
        document.getElementById('login-overlay').style.display = 'none';
        updateUserDisplay();
    } else if (!session.currentUser) {
        document.getElementById('login-overlay').style.display = 'flex';
    }
}

export async function loadUserData() {
    if (!session.currentUserId) return;

    // Carregar perfil do Supabase
    const profileResult = await supabaseGetProfile(session.currentUserId);
    if (profileResult.success) {
        session.userProfile = profileResult.profile;
        session.user.name = session.userProfile.display_name || session.userProfile.username;
        session.user.email = session.userProfile.email || '';
        session.user.rouletteWins = session.userProfile.roulette_wins || 0;
    }

    // Carregar histórico do Supabase
    const historyResult = await supabaseGetWatchHistory(session.currentUserId);
    if (historyResult.success) {
        session.user.history = historyResult.history;
    }

    // Carregar watchlist do Supabase
    const watchlistResult = await supabaseGetWatchlist(session.currentUserId);
    if (watchlistResult.success) {
        session.user.watchlist = watchlistResult.watchlist;
    }

    // Carregar preferências do Supabase
    const prefsResult = await supabaseGetPreferences(session.currentUserId);
    if (prefsResult.success && prefsResult.preferences) {
        const prefs = prefsResult.preferences;
        if (prefs.last_mode) localStorage.setItem('last_mode', prefs.last_mode);
        if (prefs.last_type) localStorage.setItem('last_type', prefs.last_type);
        if (prefs.last_library_tab) localStorage.setItem('last_library_tab', prefs.last_library_tab);
    }

    // Carregar histórico de sorteios
    const histSorteioResult = await supabaseGetSorteioHistory(session.currentUserId);
    if (histSorteioResult.success) {
        session.sorteioHistory = histSorteioResult.history.map(h => ({
            id: h.tmdb_id,
            title: h.title,
            poster_path: h.poster_path,
            media_type: h.media_type
        }));
        session.sorteioHistoryIndex = session.sorteioHistory.length > 0 ? 0 : -1;
        updateHistoryButton();
    }

    // Carregar blacklist
    const blResult = await supabaseGetBlacklist(session.currentUserId);
    if (blResult.success) {
        session.blacklist = blResult.blacklist.map(b => b.tmdb_id);
    }

    renderLibrary();
    updateHeader();
}

export async function saveUserData() {
    if (!session.currentUserId) return;

    // Atualizar perfil no Supabase
    await supabaseUpdateProfile(session.currentUserId, {
        display_name: session.user.name,
        email: session.user.email
    });

    // Salvar preferências no Supabase
    await supabaseUpdatePreferences(session.currentUserId, {
        last_mode: localStorage.getItem('last_mode') || 'discover',
        last_type: localStorage.getItem('last_type') || 'movie',
        last_library_tab: localStorage.getItem('last_library_tab') || 'watchlist'
    });
}

export function updateUserDisplay() {
    const displayEl = document.getElementById('user-display');
    const avatarEl = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');

    if (session.currentUser === 'guest') {
        displayEl.textContent = 'Convidado';
        avatarEl.textContent = '?';
        logoutBtn.style.display = 'block';
    } else if (session.currentUser && session.userProfile) {
        const displayName = session.userProfile.display_name || session.userProfile.username || 'Usuário';
        displayEl.textContent = displayName;
        avatarEl.textContent = displayName[0].toUpperCase();
        logoutBtn.style.display = 'block';
    } else if (session.currentUser) {
        displayEl.textContent = 'Usuário';
        avatarEl.textContent = '?';
        logoutBtn.style.display = 'block';
    } else {
        displayEl.textContent = 'Convidado';
        avatarEl.textContent = '?';
        logoutBtn.style.display = 'none';
    }
}

// FUNÇÕES DE LOGIN/CADASTRO

export function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
    });
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        const loginTab = document.querySelectorAll('.login-tab')[0];
        loginTab.classList.add('active');
        loginTab.setAttribute('aria-selected', 'true');
        loginTab.setAttribute('tabindex', '0');
        document.getElementById('login-form').classList.add('active');
    } else {
        const registerTab = document.querySelectorAll('.login-tab')[1];
        registerTab.classList.add('active');
        registerTab.setAttribute('aria-selected', 'true');
        registerTab.setAttribute('tabindex', '0');
        document.getElementById('register-form').classList.add('active');
    }
}

// PASSWORD STRENGTH CHECKER

export function checkPasswordStrength(password) {
    const bar = document.getElementById('password-strength-bar');
    if (!password) {
        bar.className = 'password-strength-bar';
        bar.style.width = '0';
        return;
    }

    bar.className = `password-strength-bar ${scorePassword(password).level}`;
}

export async function registerUser() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorEl = document.getElementById('register-error');

    if (!username || !email || !password || !confirm) {
        errorEl.textContent = 'Preencha todos os campos!';
        errorEl.style.display = 'block';
        return;
    }

    // Validar email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorEl.textContent = 'Digite um email válido!';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres!';
        errorEl.style.display = 'block';
        return;
    }

    if (password !== confirm) {
        errorEl.textContent = 'As senhas não coincidem!';
        errorEl.style.display = 'block';
        return;
    }

    const result = await supabaseRegister(username, email, password);

    if (!result.success) {
        if (result.error.includes('already registered') || result.error.includes('already exists')) {
            errorEl.textContent = 'Este usuário já existe!';
        } else {
            errorEl.textContent = `Erro: ${result.error}`;
        }
        errorEl.style.display = 'block';
        return;
    }

    showToast('Conta criada com sucesso!');
    openTitleFromUrl();

    // Fazer login automático
    session.currentUser = result.user;
    session.currentUserId = result.user.id;
    await loadUserData();
    document.getElementById('login-overlay').style.display = 'none';
    updateUserDisplay();
}

export async function loginUser() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = 'Preencha todos os campos!';
        errorEl.style.display = 'block';
        return;
    }

    const result = await supabaseLogin(email, password);

    if (!result.success) {
        errorEl.textContent = 'Email ou senha incorretos!';
        errorEl.style.display = 'block';
        return;
    }

    session.currentUser = result.user;
    session.currentUserId = result.user.id;
    await loadUserData();
    document.getElementById('login-overlay').style.display = 'none';
    updateUserDisplay();
    showToast(`Bem-vindo(a), ${session.user.name || 'Usuário'}!`);
    openTitleFromUrl();
}

export function loginAsGuest() {
    session.currentUser = 'guest';
    session.currentUserId = null; // Convidado não usa Supabase

    session.user = {
        name: 'Convidado',
        email: '',
        history: [],
        rouletteWins: 0
    };

    document.getElementById('login-overlay').style.display = 'none';
    updateUserDisplay();
    showToast('Bem-vindo(a), Convidado!');
    openTitleFromUrl();
}

// ESQUECI MINHA SENHA

export async function esqueceuSenha() {
    const email = document.getElementById('login-email').value.trim();

    if (!email) {
        showToast("Digite seu email primeiro!", "error");
        document.getElementById('login-email').focus();
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("Digite um email válido!", "error");
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
    } else {
        if (result.error.includes('rate limit')) {
            showToast("Muitas tentativas. Aguarde alguns minutos.", "error");
        } else {
            showToast("Se o email existir, você receberá as instruções.");
        }
    }
}

export async function logout() {
    const sair = await confirmDialog({ title: 'Sair da conta', message: 'Deseja realmente sair?', confirmLabel: 'Sair' });
    if (sair) {
        // Só salva e desloga do Supabase se NÃO for convidado
        if (session.currentUser !== 'guest' && session.currentUserId) {
            await saveUserData();
            await supabaseLogout();
        }

        session.currentUser = null;
        session.currentUserId = null;
        session.userProfile = null;
        session.user.history = [];

        document.getElementById('login-overlay').style.display = 'flex';
        updateUserDisplay();

        // Limpar formulários
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('register-username').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';

        showToast('Até logo!');
    }
}

export function updateHeader() {
    document.getElementById('user-display').innerText = session.user.name;
    document.getElementById('user-avatar').innerText = session.user.name.charAt(0).toUpperCase();
}
