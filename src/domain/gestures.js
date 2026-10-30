const MIN_SWIPE_PX = 100;

// Fechar o modal exige um gesto claramente horizontal; rolar a tela na diagonal não conta
export function isHorizontalSwipe(deltaX, deltaY) {
  return Math.abs(deltaX) > MIN_SWIPE_PX && Math.abs(deltaX) > Math.abs(deltaY) * 2;
}
