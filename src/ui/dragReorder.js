// Arrastar para reordenar (mouse, caneta e dedo), com Pointer Events.
// Só começa pela alça: no celular, o resto da tela continua rolando normalmente.
// Teclado e leitor de tela não arrastam: usam os botões ◀ ▶ de cada item.

const MIN_MOVE = 6; // px: um toque parado na alça não conta como arrasto

// Liga (ou troca as opções) no container; `null` desliga. Os ouvintes são instalados uma vez só,
// porque o container fica e o conteúdo dele é redesenhado.
export function setDragReorder(container, options) {
  if (!container) return;
  container._dragReorder = options;
  if (container._dragReorderReady) return;
  container._dragReorderReady = true;

  let drag = null;

  const finish = drop => {
    if (!drag) return;
    const { item, from, target, moved } = drag;
    item.classList.remove('is-dragging');
    item.style.transform = '';
    target?.classList.remove('is-drop-target');
    drag = null;
    const opts = container._dragReorder;
    if (drop && moved && target && opts) {
      const to = [...container.querySelectorAll(opts.itemSelector)].indexOf(target);
      if (to !== -1 && to !== from) opts.onDrop(from, to);
    }
  };

  container.addEventListener('pointerdown', e => {
    const opts = container._dragReorder;
    if (!opts || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const handle = e.target.closest(opts.handleSelector);
    const item = handle?.closest(opts.itemSelector);
    if (!item || !container.contains(item)) return;
    e.preventDefault();
    const items = [...container.querySelectorAll(opts.itemSelector)];
    drag = { item, from: items.indexOf(item), x: e.clientX, y: e.clientY, target: null, moved: false };
    handle.setPointerCapture?.(e.pointerId);
  });

  container.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < MIN_MOVE) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.item.classList.add('is-dragging');
    }
    drag.item.style.transform = `translate(${dx}px, ${dy}px)`;
    // Pela geometria, não por elementFromPoint: o item arrastado está debaixo do dedo
    const opts = container._dragReorder;
    const over = [...container.querySelectorAll(opts?.itemSelector || '[data-none]')].find(el => {
      if (el === drag.item) return false;
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }) || null;
    if (over !== drag.target) {
      drag.target?.classList.remove('is-drop-target');
      over?.classList.add('is-drop-target');
      drag.target = over;
    }
  });

  container.addEventListener('pointerup', () => finish(true));
  container.addEventListener('pointercancel', () => finish(false));
  container.addEventListener('lostpointercapture', () => finish(true));
}
