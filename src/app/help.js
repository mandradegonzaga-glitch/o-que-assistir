// Guia "Como usar": abre no tópico pedido (ex.: "Como funcionam?" dos filtros abre direto nos filtros)
import { openModal, isModalOpen } from '../ui/modals.js';
import { registerActions } from '../ui/actions.js';
import { afterAnimations } from '../ui/motion.js';

function openHelp(topic) {
  const modal = document.getElementById('modal-help');
  if (!modal) return;
  const target = topic ? document.getElementById(topic) : null;
  modal.querySelectorAll('details.help__topic').forEach(d => { d.open = d === target; });
  modal.scrollTop = 0;
  openModal('modal-help');
  if (!target) return;
  const summary = target.querySelector('summary');
  summary.focus({ preventScroll: true }); // abrir pôs o foco no diálogo; o tópico pedido vem depois
  // O painel entra deslizando: rolar antes de ele parar erra a posição
  afterAnimations(modal).then(() => {
    if (isModalOpen('modal-help')) summary.scrollIntoView({ block: 'start' }); // com folga (scroll-margin-top)
  });
}

registerActions({
  click: {
    openHelp: el => openHelp(el.dataset.arg),
  },
});
