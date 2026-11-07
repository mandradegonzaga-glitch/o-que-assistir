// Ícone das listas e coleções. O banco continua guardando o emoji (código estável, sem migração);
// a tela mostra um ícone Phosphor colorido no lugar dele.
import { ph } from './phosphor.js';

const LIST_ICONS = {
  '🎬': { icon: 'film-slate', label: 'Claquete', color: 'ouro' },
  '🍿': { icon: 'popcorn', label: 'Pipoca', color: 'ouro' },
  '❤️': { icon: 'heart', label: 'Coração', color: 'rosa' },
  '🎃': { icon: 'skull', label: 'Caveira', color: 'laranja' },
  '👻': { icon: 'ghost', label: 'Fantasma', color: 'lilas' },
  '🎄': { icon: 'tree-evergreen', label: 'Árvore de Natal', color: 'verde' },
  '😂': { icon: 'smiley', label: 'Risada', color: 'ouro' },
  '😭': { icon: 'smiley-sad', label: 'Choro', color: 'azul' },
  '😱': { icon: 'smiley-nervous', label: 'Susto', color: 'rosa' },
  '🚀': { icon: 'rocket-launch', label: 'Foguete', color: 'agua' },
  '🧸': { icon: 'balloon', label: 'Balão', color: 'rosa' },
  '🏆': { icon: 'trophy', label: 'Troféu', color: 'ouro' },
  '🌙': { icon: 'moon', label: 'Lua', color: 'lilas' },
  '🔥': { icon: 'fire', label: 'Fogo', color: 'laranja' },
  '📚': { icon: 'books', label: 'Livros', color: 'agua' },
  '🎉': { icon: 'confetti', label: 'Confete', color: 'rosa' },
};

const FALLBACK = LIST_ICONS['🎬'];

export const listIconInfo = emoji => LIST_ICONS[emoji] || FALLBACK;

// <span> decorativo com o ícone na cor da lista
export function listIcon(emoji, cls = '') {
  const { icon, color } = listIconInfo(emoji);
  return `<span class="list-icon list-icon--${color}${cls ? ` ${cls}` : ''}" data-icon="${icon}" aria-hidden="true">${ph(icon)}</span>`;
}
