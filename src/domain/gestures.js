const MIN_SWIPE_PX = 100;

// Fechar o modal exige um gesto claramente horizontal; rolar a tela na diagonal não conta
export function isHorizontalSwipe(deltaX, deltaY) {
  return Math.abs(deltaX) > MIN_SWIPE_PX && Math.abs(deltaX) > Math.abs(deltaY) * 2;
}

// Gavetas (src/ui/sheet.js). Fecha se passou de 30% da altura OU se o dedo saiu rápido:
// só a distância faria um "peteleco" curto ser ignorado.
const SHEET_DISMISS_RATIO = 0.3;
const SHEET_DISMISS_VELOCITY = 0.5; // px por ms
const SHEET_RUBBER = 0.15;

export function shouldDismissSheet({ distance, height, velocity }) {
  if (distance <= 0) return false;
  return distance > height * SHEET_DISMISS_RATIO || velocity > SHEET_DISMISS_VELOCITY;
}

// Para baixo a gaveta acompanha o dedo 1:1; para cima, só um pouco (não há para onde ir)
export function sheetDragOffset(delta) {
  return delta >= 0 ? delta : delta * SHEET_RUBBER;
}


// Cartão do Match (repasse da etapa 5, skill gestures). Vota se passou de 35% da largura OU se saiu
// rápido para o mesmo lado (um peteleco curto conta, um tremor do dedo não); na vertical, nunca.
const CARD_VOTE_RATIO = 0.35;
const CARD_VOTE_VELOCITY = 0.5; // px por ms
const CARD_FLICK_MIN_PX = 24;
const CARD_MAX_TILT = 12; // graus, alcançados no limite do voto

export function cardSwipeVote({ dx, dy, velocity, width }) {
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  const far = Math.abs(dx) > width * CARD_VOTE_RATIO;
  const flung = Math.abs(dx) > CARD_FLICK_MIN_PX && Math.abs(velocity) > CARD_VOTE_VELOCITY && Math.sign(velocity) === Math.sign(dx);
  return far || flung ? dx > 0 : null;
}

// Enquanto arrasta: inclinação e quanto cada carimbo ("Quero" / "Não quero") aparece, de 0 a 1
export function cardDragPose(dx, width) {
  const progress = Math.max(-1, Math.min(1, dx / (width * CARD_VOTE_RATIO)));
  return { rotate: progress * CARD_MAX_TILT || 0, yes: Math.max(progress, 0), no: Math.max(-progress, 0) };
}
