// Efeito 3D nos pôsteres: o pôster inclina seguindo o mouse, com um brilho onde a luz bate.
// Só com mouse (no toque não há "passar por cima") e nunca para quem pediu menos movimento.
// Um listener só no document: vale também para os pôsteres desenhados depois.
const SELECTOR = '.result-item, .library-item';
const MAX_DEG = 8;

// Ângulos e posição do brilho para o ponto (x, y) dentro de um retângulo
export function tiltFor(rect, x, y, max = MAX_DEG) {
  const px = Math.min(1, Math.max(0, (x - rect.left) / rect.width));
  const py = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
  return {
    rotateX: +((0.5 - py) * 2 * max).toFixed(2), // em cima: inclina para trás
    rotateY: +((px - 0.5) * 2 * max).toFixed(2),
    glareX: Math.round(px * 100),
    glareY: Math.round(py * 100),
  };
}

export function initTilt(win = window) {
  const query = win.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let active = null;
  let frame = 0;
  let last = null;

  const reset = el => {
    el.classList.remove('is-tilting');
    ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y'].forEach(p => el.style.removeProperty(p));
  };

  win.document.addEventListener('pointermove', e => {
    if (!query.matches || e.pointerType !== 'mouse') return;
    const el = e.target.closest?.(SELECTOR);
    if (active && active !== el) reset(active);
    active = el;
    if (!el) return;
    last = { el, x: e.clientX, y: e.clientY };
    if (frame) return;
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      if (!last || last.el !== active) return;
      const t = tiltFor(last.el.getBoundingClientRect(), last.x, last.y);
      last.el.style.setProperty('--tilt-x', `${t.rotateX}deg`);
      last.el.style.setProperty('--tilt-y', `${t.rotateY}deg`);
      last.el.style.setProperty('--glare-x', `${t.glareX}%`);
      last.el.style.setProperty('--glare-y', `${t.glareY}%`);
      last.el.classList.add('is-tilting');
    });
  });

  win.document.addEventListener('pointerout', e => {
    if (active && !active.contains(e.relatedTarget)) {
      reset(active);
      active = null;
    }
  });
}
