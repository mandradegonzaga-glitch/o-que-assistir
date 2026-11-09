// Dados pequenos guardados na própria conta (metadados do usuário no Supabase): progresso, provedores,
// lista do Match. Sincronizam entre aparelhos sem tabela no banco. A cópia em memória muda junto
// com a gravação, para quem ler logo depois ver o valor novo.
import { supabaseUpdateUserData } from '../api/supabase.js';
import { isAccount, session } from '../state/appState.js';

export function readAccountData(key) {
  return isAccount() ? session.currentUser.user_metadata?.[key] : undefined;
}

export function writeAccountData(patch) {
  if (!isAccount()) return Promise.resolve({ success: false });
  session.currentUser.user_metadata = { ...session.currentUser.user_metadata, ...patch };
  return supabaseUpdateUserData(patch);
}
