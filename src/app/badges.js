// Conquistas: avalia todas depois de cada mudança que conta e comemora as novas.
// Convidado guarda as já comemoradas neste aparelho; conta, no banco.
import { supabaseCheckBadge, supabaseUnlockBadge } from '../api/supabase.js';
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

    for (const badge of earned) {
        const { unlocked } = await supabaseCheckBadge(session.currentUserId, badge.name);
        if (unlocked) continue;
        const result = await supabaseUnlockBadge(session.currentUserId, badge.name);
        if (result.success) showAchievement(badge);
    }
}
