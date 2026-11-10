// Perfil, conta e conquistas
import { supabaseChangePassword, supabaseDeleteAccount, supabaseUpdateProfile } from '../api/supabase.js';
import { endSession, updateUserDisplay } from './auth.js';
import { renderBlacklist } from './blacklist.js';
import { BADGE_CATEGORIES, computeBadgeStatuses } from '../domain/badges.js';
import { isAccount, isGuest, session } from '../state/appState.js';
import { badgeCard } from '../ui/badgeIcons.js';
import { showToast } from '../ui/feedback.js';
import { closeModal, confirmDialog, isModalOpen, openModal } from '../ui/modals.js';
import { formatCount } from '../utils/format.js';
import { renderProgress } from './progress.js';
import { renderTasteDna } from './tasteDna.js';
import { passwordError } from '../domain/passwordStrength.js';
import { emit, on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';

// XP e desafios mudaram com o perfil aberto: acompanha
on('progress:changed', () => {
    if (isModalOpen('modal-profile')) renderProgress();
});

export function abrirPerfil() {
    emit('profile:opened');
    renderProgress();
    document.getElementById('profile-name').value = session.user.name;
    document.getElementById('profile-email').value = session.user.email || '';
    document.getElementById('profile-avatar-large').innerText = session.user.name.charAt(0).toUpperCase();
    document.getElementById('stats-count').innerText = formatCount(session.user.history.length);
    document.getElementById('stats-wins').innerText = formatCount(session.user.rouletteWins);
    renderTasteDna();
    renderBadges();
    renderBlacklist();

    const guest = isGuest();
    const changePasswordSection = document.getElementById('change-password-section');
    const deleteAccountSection = document.getElementById('delete-account-section');

    if (changePasswordSection) {
        changePasswordSection.style.display = guest ? 'none' : 'block';
    }
    if (deleteAccountSection) {
        deleteAccountSection.style.display = guest ? 'none' : 'block';
    }

    openModal('modal-profile');
}

async function salvarPerfil() {
    if (isGuest()) {
        closeModal('modal-profile');
        return;
    }
    if (!session.currentUserId) return;

    const name = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();

    if (!name) {
        showToast("Digite um nome válido", "error");
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
        updateUserDisplay();
        closeModal('modal-profile');
        showToast("Perfil salvo com sucesso");
    } else {
        showToast("Erro ao salvar perfil", "error");
    }
}

// ALTERAR SENHA

async function alterarSenha() {
    if (!isAccount()) {
        showToast("Convidados não podem alterar senha", "error");
        return;
    }

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (!newPassword || !confirmPassword) {
        showToast("Preencha os dois campos de senha", "error");
        return;
    }

    const invalid = passwordError(newPassword, confirmPassword);
    if (invalid) {
        showToast(invalid, "error");
        return;
    }

    const result = await supabaseChangePassword(newPassword);

    if (result.success) {
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
        showToast("Senha alterada com sucesso");
    } else {
        showToast("Erro ao alterar senha: " + result.error, "error");
    }
}

// DELETAR CONTA

async function deletarConta() {
    if (!isAccount()) {
        showToast("Convidados não têm conta para deletar", "error");
        return;
    }

    const confirmar = await confirmDialog({
        title: 'Deletar conta permanentemente?',
        message: 'Todos os seus dados serão apagados:\n• Watchlist\n• Histórico de filmes assistidos\n• Conquistas\n• Preferências\n\nEsta ação NÃO pode ser desfeita.',
        confirmLabel: 'Continuar',
        danger: true
    });

    if (!confirmar) return;

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
        closeModal('modal-profile');
        endSession();

        showToast("Conta deletada com sucesso. Até mais");
    } else {
        showToast("Não foi possível deletar a conta. Nada foi apagado; tente de novo.", "error");
    }
}

function renderBadges() {
    const container = document.getElementById('badges-container');
    container.innerHTML = '';
    const statuses = computeBadgeStatuses(session.user.history, session.user.rouletteWins, session.progress);
    const unlockedCount = statuses.filter(s => s.unlocked).length;
    const bar = document.getElementById('badges-progress-bar');
    document.getElementById('badges-progress-label').textContent = `${formatCount(unlockedCount)} de ${formatCount(statuses.length)} conquistas`;
    bar.setAttribute('aria-valuemax', statuses.length);
    bar.setAttribute('aria-valuenow', unlockedCount);
    document.getElementById('badges-progress-fill').style.width = `${(unlockedCount / statuses.length) * 100}%`;
    BADGE_CATEGORIES.forEach(category => {
      container.insertAdjacentHTML('beforeend', `<h4 class="badge-category">${category}</h4>`);
      statuses.filter(s => s.badge.category === category).forEach(({ badge, unlocked, current, goal, counted }) => {
        container.append(badgeCard(badge, { unlocked, status: true, progress: !unlocked && counted ? { current, goal } : null }));
      });
    });
}

registerActions({
    click: {
        abrirPerfil,
        alterarSenha,
        deletarConta,
        salvarPerfil,
    },
});
