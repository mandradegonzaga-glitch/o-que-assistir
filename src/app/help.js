// Guia "Como usar": abre no tópico pedido (ex.: "Como funcionam?" dos filtros abre direto nos filtros)
const OPEN_ANIMATION_MS = 350; // o painel entra deslizando: rolar antes disso erra a posição

export function openHelp(topic) {
  const modal = document.getElementById('modal-help');
  if (!modal) return;
  const target = topic ? document.getElementById(topic) : null;
  modal.querySelectorAll('details.help__topic').forEach(d => { d.open = d === target; });
  modal.scrollTop = 0;
  modal.style.display = 'flex';
  if (!target) return;
  const summary = target.querySelector('summary');
  // Depois que o diálogo recebe o foco (initModalA11y), o foco vai para o tópico aberto
  setTimeout(() => summary.focus({ preventScroll: true }), 0);
  setTimeout(() => {
    if (modal.style.display === 'flex') summary.scrollIntoView({ block: 'start' }); // com folga (scroll-margin-top)
  }, OPEN_ANIMATION_MS);
}
