// Perfil, conta e conquistas
import { supabaseChangePassword, supabaseCheckBadge, supabaseDeleteAccount, supabaseUnlockBadge, supabaseUpdateProfile } from '../api/supabase.js';
import { updateHeader, updateUserDisplay } from './auth.js';
import { renderBlacklist } from './blacklist.js';
import { computeBadgeStatuses, isBadgeEarned } from '../domain/badges.js';
import { session } from '../state/appState.js';
import { BADGE_ICONS } from '../ui/badgeIcons.js';
import { showAchievement, showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { formatCount } from '../utils/format.js';
import { BADGE_DEFINITIONS } from '../domain/badges.js';

// PERFIL

export function abrirPerfil() {
    document.getElementById('profile-name').value = session.user.name;
    document.getElementById('profile-email').value = session.user.email || '';
    document.getElementById('profile-avatar-large').innerText = session.user.name.charAt(0).toUpperCase();
    document.getElementById('stats-count').innerText = formatCount(session.user.history.length);
    document.getElementById('stats-wins').innerText = formatCount(session.user.rouletteWins);
    renderBadges();
    renderBlacklist();

    // Ocultar seções de senha/deletar para convidados
    const isGuest = session.currentUser === 'guest';
    const changePasswordSection = document.getElementById('change-password-section');
    const deleteAccountSection = document.getElementById('delete-account-section');

    if (changePasswordSection) {
        changePasswordSection.style.display = isGuest ? 'none' : 'block';
    }
    if (deleteAccountSection) {
        deleteAccountSection.style.display = isGuest ? 'none' : 'block';
    }

    document.getElementById('modal-profile').style.display = 'flex';
}

export async function salvarPerfil() {
    if (!session.currentUserId) return;

    const name = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();

    if (!name) {
        showToast("Digite um nome válido!", "error");
        return;
    }

    session.user.name = name;
    session.user.email = email;

    const result = await supabaseUpdateProfile(session.currentUserId, {
        display_name: name,
        email: email
    });

    if (result.success) {
        session.userProfile = result.profile;
        updateHeader();
        document.getElementById('modal-profile').style.display = 'none';
        showToast("Perfil salvo com sucesso!");
    } else {
        showToast("Erro ao salvar perfil!", "error");
    }
}

// ALTERAR SENHA

export async function alterarSenha() {
    if (!session.currentUserId || session.currentUser === 'guest') {
        showToast("Convidados não podem alterar senha!", "error");
        return;
    }

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (!newPassword || !confirmPassword) {
        showToast("Preencha os dois campos de senha!", "error");
        return;
    }

    if (newPassword.length < 6) {
        showToast("A senha deve ter pelo menos 6 caracteres!", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast("As senhas não coincidem!", "error");
        return;
    }

    const result = await supabaseChangePassword(newPassword);

    if (result.success) {
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
        showToast("Senha alterada com sucesso!");
    } else {
        showToast("Erro ao alterar senha: " + result.error, "error");
    }
}

// DELETAR CONTA

export async function deletarConta() {
    if (!session.currentUserId || session.currentUser === 'guest') {
        showToast("Convidados não têm conta para deletar!", "error");
        return;
    }

    const confirmar = await confirmDialog({
        title: 'Deletar conta permanentemente?',
        message: 'Todos os seus dados serão apagados:\n• Watchlist\n• Histórico de filmes assistidos\n• Conquistas\n• Preferências\n\nEsta ação NÃO pode ser desfeita.',
        confirmLabel: 'Continuar',
        danger: true
    });

    if (!confirmar) return;

    // Segunda confirmação (o texto antigo pedia "Digite OK", mas não havia campo para digitar)
    const confirmarFinal = await confirmDialog({
        title: 'Última confirmação',
        message: 'Deseja realmente deletar sua conta?',
        confirmLabel: 'Deletar minha conta',
        danger: true
    });

    if (!confirmarFinal) return;

    showToast("Deletando conta...");

    const result = await supabaseDeleteAccount();

    if (result.success) {
        session.currentUser = null;
        session.currentUserId = null;
        session.userProfile = null;
        session.user.history = [];

        document.getElementById('modal-profile').style.display = 'none';
        document.getElementById('login-overlay').style.display = 'flex';
        updateUserDisplay();

        showToast("Conta deletada com sucesso. Até mais!");
    } else {
        showToast("Não foi possível deletar a conta. Nada foi apagado; tente de novo.", "error");
    }
}

export function renderBadges() {
    const container = document.getElementById('badges-container');
    container.innerHTML = '';
    const statuses = computeBadgeStatuses(session.user.history, session.user.rouletteWins);
    const unlockedCount = statuses.filter(s => s.unlocked).length;
    const bar = document.getElementById('badges-progress-bar');
    document.getElementById('badges-progress-label').textContent = `${formatCount(unlockedCount)} de ${formatCount(statuses.length)} conquistas`;
    bar.setAttribute('aria-valuemax', statuses.length);
    bar.setAttribute('aria-valuenow', unlockedCount);
    document.getElementById('badges-progress-fill').style.width = `${(unlockedCount / statuses.length) * 100}%`;
    statuses.forEach(({ badge: b, unlocked }) => {
        container.innerHTML += `
            <div class="badge-item ${unlocked ? 'unlocked' : ''}" data-color="${b.color}">
                <div class="badge-icon">${BADGE_ICONS[b.icon]}</div>
                <div class="badge-info">
                    <h4>${b.name}</h4>
                    <p>${b.desc}</p>
                </div>
            </div>`;
    });
}

// BADGE UNLOCK CHECKER

export async function checkBadgeUnlock(badgeName) {
    if (!session.currentUserId) return;

    if (isBadgeEarned(badgeName, session.user.history, session.user.rouletteWins)) {
        // Verificar se já foi desbloqueado no Supabase
        const checkResult = await supabaseCheckBadge(session.currentUserId, badgeName);

        if (!checkResult.unlocked) {
            // Desbloquear no Supabase
            const unlockResult = await supabaseUnlockBadge(session.currentUserId, badgeName);
            if (unlockResult.success) {
                showAchievement(BADGE_DEFINITIONS.find(b => b.name === badgeName));
            }
        }
    }
}
