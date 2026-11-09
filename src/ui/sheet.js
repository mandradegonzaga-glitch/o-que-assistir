// Gavetas (etapa 5a do redesign): no celular as janelas sobem de baixo e fecham arrastando para baixo.
// Regras das skills gestures/emil-design-eng: enquanto o dedo está na tela a gaveta É o dedo (1:1,
// sem transição); ao soltar, fecha por distância OU por velocidade; o fundo escurece junto com o
// arraste (um só valor de progresso); fecha na direção em que entrou; dá para pegar no meio.
// A abertura é CSS (@starting-style + transição, no fim do style.css); aqui fica só o gesto.

import { sheetDragOffset, shouldDismissSheet } from '../domain/gestures.js';

export const SHEET_QUERY = '(max-width: 640px)';
const OVERLAY_ALPHA = 0.95;

const isSheet = () => window.matchMedia(SHEET_QUERY).matches;

export function initSheets({ onDismiss }) {
  document.querySelectorAll('.modal-overlay:not(#modal-confirm)').forEach(overlay => {
    const sheet = overlay.querySelector('.modal-content');
    if (!sheet || sheet.querySelector(':scope > .sheet-handle')) return;
    const handle = document.createElement('div');
    handle.className = 'sheet-handle';
    handle.setAttribute('aria-hidden', 'true');
    handle.dataset.sheetDrag = '';
    sheet.prepend(handle);
    bindDrag(overlay, sheet, onDismiss);
  });
}

function bindDrag(overlay, sheet, onDismiss) {
  let drag = null;

  sheet.addEventListener('pointerdown', e => {
    if (!isSheet() || e.button !== 0) return;
    const zone = e.target.closest('[data-sheet-drag]');
    if (!zone || !sheet.contains(zone)) return;
    // Só arrasta com a gaveta no começo; rolada para baixo, o toque é da rolagem
    if (overlay.scrollTop > 2) return;
    drag = { id: e.pointerId, startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0, offset: 0, height: sheet.offsetHeight };
    zone.setPointerCapture(e.pointerId);
    sheet.style.transition = 'none';
    overlay.style.transition = 'none';
    sheet.classList.add('is-dragging');
  });

  sheet.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.velocity = (e.clientY - drag.lastY) / dt;
    drag.lastY = e.clientY;
    drag.lastT = e.timeStamp;
    drag.offset = sheetDragOffset(e.clientY - drag.startY);
    sheet.style.transform = `translateY(${drag.offset}px)`;
    const progress = Math.min(Math.max(drag.offset / drag.height, 0), 1);
    overlay.style.backgroundColor = `rgba(15, 11, 24, ${OVERLAY_ALPHA * (1 - progress)})`;
  });

  const release = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { offset, height, lastT } = drag;
    // Dedo parado por mais de 100 ms antes de soltar: não houve arremesso, a velocidade não conta
    const velocity = e.timeStamp - lastT > 100 ? 0 : drag.velocity;
    drag = null;
    sheet.classList.remove('is-dragging');
    sheet.style.transition = '';
    overlay.style.transition = '';
    if (e.type !== 'pointercancel' && shouldDismissSheet({ distance: offset, height, velocity })) {
      onDismiss(overlay, { fromDrag: true });
    } else {
      // Volta rápido (devagar parece que a interface discorda de quem arrastou)
      sheet.style.transform = '';
      overlay.style.backgroundColor = '';
    }
  };
  sheet.addEventListener('pointerup', release);
  sheet.addEventListener('pointercancel', release);
}

// Limpa o que o gesto deixou no elemento (chamado depois de fechar)
export function resetSheet(overlay) {
  const sheet = overlay.querySelector('.modal-content');
  if (sheet) sheet.style.transform = '';
  overlay.style.backgroundColor = '';
}
