// Reações rápidas (🔥 😢 😂 🤯) no título aberto, quando ele já está em "Já assistidos".
// Convidado guarda no aparelho; conta, no histórico do Supabase (os amigos veem no perfil).
import { supabaseSetReaction } from '../api/supabase.js';
import { nextReaction } from '../domain/reactions.js';
import { isGuest, session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { saveGuestHistory } from './guestLibrary.js';
import { emit, on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';


const entryOf = id => (session.user?.history || []).find(h => h.id === id);

let saving = 0; // cliques seguidos: só a última resposta do servidor vale

// O histórico mudou (marcou, desmarcou, terminou a série): o "Como foi?" do título aberto acompanha
on('library:changed', renderReactions);
on('title:opened', renderReactions);

function renderReactions() {
  const box = document.getElementById('m-reactions');
  if (!box) return;
  const entry = state.currentMovie ? entryOf(state.currentMovie.id) : null;
  box.hidden = !entry;
  if (!entry) return;
  box.querySelectorAll('[data-action="reactTitle"]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.arg === entry.reaction));
  });
  document.getElementById('m-reactions-note').hidden = isGuest();
}

async function reactTitle(chosen) {
  const entry = state.currentMovie ? entryOf(state.currentMovie.id) : null;
  if (!entry) return;
  const before = entry.reaction ?? null;
  const next = nextReaction(before, chosen);
  if (next === before) return;

  entry.reaction = next;
  emit('library:changed');
  if (isGuest()) {
    saveGuestHistory(session.user.history);
    return;
  }

  const mine = ++saving;
  const result = await supabaseSetReaction(entry.id, next);
  if (result.success || mine !== saving) return;
  entry.reaction = before;
  emit('library:changed');
  showToast('Não foi possível salvar a reação. Tente de novo.', 'error');
}

registerActions({
  click: {
    reactTitle: el => reactTitle(el.dataset.arg),
  },
});
