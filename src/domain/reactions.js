// Reações rápidas aos títulos assistidos. O id é o que vai para o banco (database/reactions.sql) e
// dá nome ao selo ilustrado (icons/reactions/<id>.webp, gerados no Flow do Google Labs, etapa 5e).
// As duas últimas são as negativas, pedido do usuário.
export const REACTIONS = [
  { id: 'fire', label: 'Amei' },
  { id: 'sad', label: 'Chorei' },
  { id: 'laugh', label: 'Ri muito' },
  { id: 'mind', label: 'Explodiu minha cabeça' },
  { id: 'dislike', label: 'Não curti' },
  { id: 'sleep', label: 'Dormi no meio' },
];

export const reactionOf = id => REACTIONS.find(r => r.id === id) || null;

// Tocar na reação que já está marcada tira; outra troca; um id desconhecido não muda nada
export function nextReaction(current, chosen) {
  if (!reactionOf(chosen)) return current ?? null;
  return current === chosen ? null : chosen;
}
