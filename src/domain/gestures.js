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

