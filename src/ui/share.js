// Compartilhar um link: no celular, o compartilhar do sistema; no computador, copia o texto com o link
import { showToast } from './feedback.js';

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

// Endereço do app com um parâmetro (?match=…, ?amigo=…, ?lista=…)
export const appBase = () => `${location.origin}${location.pathname}`;
export const appLink = (param, value) => `${appBase()}?${param}=${encodeURIComponent(value)}`;

// Troca parâmetros do endereço sem criar entrada no histórico ({ amigo: null } tira o parâmetro)
export function setUrlParams(changes) {
  const url = new URL(location.href);
  Object.entries(changes).forEach(([name, value]) => {
    if (value === null) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  });
  history.replaceState(null, '', url);
}

export async function shareLink(url, text, title = 'O Que Assistir?') {
  if (isTouch() && navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Não foi possível abrir o compartilhar. Copie o link.', 'error');
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast('Link copiado! Cole na conversa.');
  } catch {
    showToast('Não foi possível copiar. Selecione o link e copie.', 'error');
  }
}
