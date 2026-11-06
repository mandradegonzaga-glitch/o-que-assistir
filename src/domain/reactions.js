// Reações rápidas aos títulos assistidos. O id é o que vai para o banco (database/reactions.sql).
export const REACTIONS = [
  { id: 'fire', emoji: '🔥', label: 'Amei' },
  { id: 'sad', emoji: '😢', label: 'Chorei' },
  { id: 'laugh', emoji: '😂', label: 'Ri muito' },
  { id: 'mind', emoji: '🤯', label: 'Explodiu minha cabeça' },
];

export const reactionOf = id => REACTIONS.find(r => r.id === id) || null;

// Tocar na reação que já está marcada tira; outra troca; um id desconhecido não muda nada
export function nextReaction(current, chosen) {
  if (!reactionOf(chosen)) return current ?? null;
  return current === chosen ? null : chosen;
}
