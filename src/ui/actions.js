// Delegação de eventos: o HTML declara data-action / data-input / data-change / data-enter e um
// único listener no document chama o handler. Funciona também para o que é desenhado depois.
// Cada parte do app registra as próprias ações (registerActions, no fim do seu arquivo); o handler
// recebe o elemento, de onde lê o que precisar (data-arg, data-id, value, checked...).
const tables = { click: {}, input: {}, change: {}, enter: {} };

export function registerActions(byKind) {
  for (const [kind, handlers] of Object.entries(byKind)) {
    for (const [name, handler] of Object.entries(handlers)) {
      if (tables[kind][name]) console.error(`Ação "${name}" (${kind}) registrada duas vezes`);
      tables[kind][name] = handler;
    }
  }
}

function run(kind, name, el, event) {
  const handler = tables[kind][name];
  if (handler) handler(el, event);
  else console.error(`Nenhuma ação "${name}" (${kind}) registrada`);
}

export function initActions() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    run('click', el.dataset.action, el, e);
  });

  document.addEventListener('input', (e) => {
    const name = e.target.dataset?.input;
    if (name) run('input', name, e.target, e);
  });

  document.addEventListener('change', (e) => {
    const name = e.target.dataset?.change;
    if (name) run('change', name, e.target, e);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const name = e.target.dataset?.enter;
    if (name) {
      // Sem isso, se a ação mover o foco para um botão (ex.: o cartão da lista recém-criada), o mesmo Enter o aciona
      e.preventDefault();
      run('enter', name, e.target, e);
      return;
    }
    // Sugestões de ator são role="option": Enter equivale ao clique
    if (e.target.matches?.('[role="option"][data-action]')) e.target.click();
  });
}
