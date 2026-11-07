// Ícones das conquistas (a regra de cada uma fica em src/domain/badges.js).
// Phosphor duotone, a mesma família dos ícones de destaque do app (src/ui/phosphor.js).
import { ph } from './phosphor.js';

const ICON_OF = {
  friends: 'users-three',      // duas ou mais pessoas
  send: 'paper-plane-tilt',    // avião de papel
  ticket: 'ticket',            // ingresso
  popcorn: 'popcorn',          // balde de pipoca
  film: 'film-slate',          // claquete
  monocle: 'magnifying-glass', // lupa
  tv: 'television',            // TV
  ghost: 'ghost',              // fantasma
  laugh: 'mask-happy',         // máscara da comédia
  heart: 'heart',              // coração
  alien: 'alien',              // alien
  bolt: 'lightning',           // raio
  roulette: 'dice-five',       // dado na face 5: as cinco vitórias da conquista
  vhs: 'cassette-tape',        // fita
  trophy: 'trophy',            // troféu
  sakura: 'flower',            // flor (doramas)
  sparkles: 'sparkle',         // brilhos da animação
  camera: 'video-camera',      // câmera de documentário
  detective: 'detective',      // detetive
  flame: 'fire',               // chama da sequência
  moon: 'moon-stars',          // lua com estrelas
};

export const BADGE_ICONS = Object.fromEntries(Object.entries(ICON_OF).map(([key, name]) => [key, ph(name, { weight: 'duotone' })]));
