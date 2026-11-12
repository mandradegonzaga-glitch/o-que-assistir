// Reações rápidas no título aberto, quando ele já está em "Já assistidos": selos ilustrados (etapa 5e).
// Convidado guarda no aparelho; conta, no histórico do Supabase (os amigos veem no perfil).
import { REACTIONS, nextReaction } from '../domain/reactions.js';
import { reactionImg } from '../ui/icons.js';
import { prefersReducedMotion } from '../ui/motion.js';
import { isGuest, session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { setReaction } from './libraryStore.js';
import { isWatched } from './library.js';
import { emit, on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';


const entryOf = id => (isWatched(id) ? (session.user?.history || []).find(h => h.id === id) : null);

let saving = 0; // cliques seguidos: só a última resposta do servidor vale

// O histórico mudou (marcou, desmarcou, terminou a série): o "Como foi?" do título aberto acompanha
on('library:changed', renderReactions);
on('title:opened', renderReactions);

// Os botões saem da lista de reações (um dono só para ids, nomes e selos)
export function initReactions() {
  document.querySelector('#m-reactions .reactions__list').innerHTML = REACTIONS.map(r =>
    `<button type="button" class="reaction" data-action="reactTitle" data-arg="${r.id}" aria-pressed="false">${reactionImg(r.id)}${r.label}</button>`).join('');
}

// Escolheu: o selo surge de 30% com um leve ressalto (efeito do clleancode, o mesmo do coração do
// "Deu Match!": 0,5 s, back.out)
const POP = { duration: 500, easing: 'cubic-bezier(0.34, 1.36, 0.64, 1)' };

function pop(id) {
  if (prefersReducedMotion()) return;
  document.querySelector(`#m-reactions [data-arg="${id}"] img`)
    ?.animate([{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], POP);
}

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

  const mine = ++saving;
  const pending = setReaction(entry.id, next);
  emit('library:changed');
  if (next) pop(next);
  const result = await pending;
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
