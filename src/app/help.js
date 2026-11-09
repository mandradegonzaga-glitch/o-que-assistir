// Guia "Como usar": abre no tópico pedido (ex.: "Como funcionam?" dos filtros abre direto nos filtros)
import { registerActions } from '../ui/actions.js';
import { afterAnimations } from '../ui/motion.js';

function openHelp(topic) {
  const modal = document.getElementById('modal-help');
  if (!modal) return;
  const target = topic ? document.getElementById(topic) : null;
  modal.querySelectorAll('details.help__topic').forEach(d => { d.open = d === target; });
  modal.scrollTop = 0;
  modal.style.display = 'flex';
  if (!target) return;
  const summary = target.querySelector('summary');
  // O diálogo recebe o foco ao abrir (initModalA11y, que roda antes desta microtarefa); depois, o tópico
  queueMicrotask(() => summary.focus({ preventScroll: true }));
  // O painel entra deslizando: rolar antes de ele parar erra a posição
  afterAnimations(modal).then(() => {
    if (modal.style.display === 'flex') summary.scrollIntoView({ block: 'start' }); // com folga (scroll-margin-top)
  });
}

registerActions({
  click: {
    openHelp: el => openHelp(el.dataset.arg),
  },
});
