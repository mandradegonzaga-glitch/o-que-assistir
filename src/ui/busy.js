// Botão ocupado enquanto uma tarefa roda. Sem `disabled`: um botão desabilitado perde o foco do
// teclado no meio da ação. aria-busy e aria-disabled avisam o leitor de tela e o CSS; um segundo
// toque enquanto roda não faz nada.
//   label: texto do rótulo (.btn-label) enquanto roda ("Gerando…")
//   failure: aviso se a tarefa falhar (o erro vai para o console); sem ele, o erro segue para quem chamou
import { showToast } from './feedback.js';

export async function whileBusy(buttons, task, { label, failure } = {}) {
  const list = [buttons].flat().filter(Boolean);
  if (list.some(button => button.getAttribute('aria-busy') === 'true')) return undefined;
  const labelEl = label ? list[0]?.querySelector('.btn-label') : null;
  const original = labelEl?.textContent;
  list.forEach(button => {
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-disabled', 'true');
  });
  if (labelEl) labelEl.textContent = label;
  try {
    return await task();
  } catch (error) {
    if (!failure) throw error;
    console.error(error);
    showToast(failure, 'error');
    return undefined;
  } finally {
    list.forEach(button => {
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-disabled');
    });
    if (labelEl && labelEl.textContent === label) labelEl.textContent = original;
  }
}
