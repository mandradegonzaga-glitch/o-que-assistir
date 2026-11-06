// Importa para a conta o que a versão antiga guardou neste navegador.
// Os dados locais só são apagados depois de o banco confirmar a gravação.
import { supabaseImportLegacyData, supabaseUpdateProfile } from '../api/supabase.js';
import { collectLegacyData, hasLegacyData, stripPasswords } from '../domain/legacyData.js';
import { session } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { formatCount, pluralize } from '../utils/format.js';
import { storage } from '../utils/storage.js';
import { loadUserData } from './auth.js';
import { GUEST_KEYS, getGuestData } from './guestLibrary.js';

const LEGACY_KEYS = ['all_users', 'current_user', 'watchlist_obj', 'vistos_obj', ...GUEST_KEYS];
const LATER_KEY = 'legacy_import_later';
const ASK_AGAIN_MS = 7 * 24 * 60 * 60 * 1000;

function readLegacyData(includeGuest = true) {
  return collectLegacyData({
    guest: includeGuest ? getGuestData() : null,
    allUsers: storage.get('all_users'),
    currentUser: localStorage.getItem('current_user'),
    watchlist: storage.get('watchlist_obj'),
    vistos: storage.get('vistos_obj'),
  });
}

export function legacyDataAvailable() {
  return hasLegacyData(readLegacyData(false)); // só a versão antiga: o convidado já sabe o que tem
}

// Roda em toda abertura, com ou sem importação: a versão antiga guardava senhas em texto puro
export function removeLegacyPasswords() {
  const allUsers = storage.get('all_users');
  if (allUsers) storage.set('all_users', stripPasswords(allUsers));
}

// Contas antigas não existem no servidor: quem as usava precisa saber que deve criar uma nova
export function showLegacyHint() {
  document.getElementById('legacy-hint').hidden = !legacyDataAvailable();
}

function describe({ history, watchlist, series = [], lists = [] }) {
  const parts = [];
  if (watchlist.length) parts.push(`${formatCount(watchlist.length)} em Quero Assistir`);
  if (history.length) parts.push(`${formatCount(history.length)} em Já Assistidos`);
  if (series.length) parts.push(`o progresso de ${formatCount(series.length)} ${pluralize(series.length, 'série', 'séries')}`);
  if (lists.length) parts.push(`${formatCount(lists.length)} ${pluralize(lists.length, 'lista sua', 'listas suas')}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts.join('');
}

export async function offerLegacyImport() {
  if (!session.currentUserId || session.currentUser === 'guest') return;
  const data = readLegacyData();
  if (!hasLegacyData(data)) return;
  if (Date.now() - Number(localStorage.getItem(LATER_KEY) || 0) < ASK_AGAIN_MS) return;

  const total = data.history.length + data.watchlist.length + data.series.length + data.lists.length;
  const accepted = await confirmDialog({
    title: 'Trazer sua lista para a conta?',
    message: `Encontramos neste navegador ${describe(data)}. Quer ${pluralize(total, 'adicionar esse título', 'adicionar esses títulos')} à sua conta?`,
    confirmLabel: 'Trazer para a conta',
    cancelLabel: 'Agora não',
  });

  if (!accepted) {
    localStorage.setItem(LATER_KEY, String(Date.now()));
    return;
  }

  const result = await supabaseImportLegacyData(session.currentUserId, data);
  if (!result.success) {
    showToast('Não foi possível trazer sua lista. Nada foi perdido; tentaremos de novo no próximo acesso.', 'error');
    return;
  }

  if (data.rouletteWins > (session.user.rouletteWins || 0)) {
    await supabaseUpdateProfile(session.currentUserId, { roulette_wins: data.rouletteWins });
  }

  LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
  localStorage.removeItem(LATER_KEY);
  await loadUserData();
  showToast(`Lista trazida para a sua conta: ${describe(data)}.`);
}
