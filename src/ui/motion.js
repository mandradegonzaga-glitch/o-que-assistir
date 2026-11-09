// Esperar o movimento que o CSS já define, em vez de copiar a duração para o JS:
// mudar a animação no CSS não deixa um temporizador errado para trás.
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Resolve quando as animações e transições finitas do elemento (e de dentro dele) terminam.
// Sem nenhuma em curso (ex.: "reduzir movimento"), resolve na hora.
export function afterAnimations(el) {
  const running = el.getAnimations({ subtree: true })
    .filter(animation => animation.effect?.getComputedTiming().endTime !== Infinity);
  return Promise.all(running.map(animation => animation.finished.catch(() => {})));
}
