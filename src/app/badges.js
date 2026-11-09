// Conquistas: avalia todas depois de cada mudança que conta e comemora as novas.
// Convidado guarda as já comemoradas neste aparelho; conta, no banco.
import { supabaseGetBadges, supabaseUnlockBadge } from '../api/supabase.js';
import { BADGE_DEFINITIONS } from '../domain/badges.js';
import { isGuest, session } from '../state/appState.js';
import { showAchievement } from '../ui/feedback.js';
import { addGuestBadge, getGuestBadges } from './guestLibrary.js';

export async function checkAllBadges() {
    if (!session.currentUser) return;
    const earned = BADGE_DEFINITIONS.filter(b => b.check(session.user.history, session.user.rouletteWins, session.progress));
    if (earned.length === 0) return;

    if (isGuest()) {
        const known = getGuestBadges();
        earned.filter(b => !known.includes(b.name)).forEach(b => {
            addGuestBadge(b.name);
            showAchievement(b);
        });
        return;
    }

    const known = await accountBadges();
    if (!known) return; // sem saber o que já foi ganho, não comemora de novo
    for (const badge of earned.filter(b => !known.has(b.name))) {
        known.add(badge.name);
        const result = await supabaseUnlockBadge(session.currentUserId, badge.name);
        if (!result.success) known.delete(badge.name);
        else if (!result.message) showAchievement(badge); // message: já estava gravada (outro aparelho)
    }
}

// Lidas do banco uma vez por sessão; depois, só as novas vão ao banco
async function accountBadges() {
    if (!session.badges) {
        const result = await supabaseGetBadges(session.currentUserId);
        if (!result.success) return null;
        session.badges ??= new Set(result.names);
    }
    return session.badges;
}
