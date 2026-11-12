// Carrossel em disco (efeito do clleancode, repasse da etapa 2): cada pôster muda de tamanho e de
// opacidade conforme a distância até o centro da fileira, medida em "posições" (larguras de pôster).
// Números do site de referência: 12% menor por posição; aqui a opacidade não chega a zero, para os
// vizinhos continuarem à vista (é uma fileira para escolher, não uma vitrine)
const MAX_STEPS = 2;
const SHRINK = 0.12;
const FADE = [1, 0.55, 0.35]; // opacidade no centro, a 1 e a 2 posições

export function discPose(distance) {
  const d = Math.min(Math.abs(distance), MAX_STEPS);
  const step = Math.floor(d);
  const t = d - step;
  const opacity = step >= MAX_STEPS ? FADE[MAX_STEPS] : FADE[step] + (FADE[step + 1] - FADE[step]) * t;
  return {
    scale: Math.round((1 - SHRINK * d) * 1000) / 1000,
    opacity: Math.round(opacity * 1000) / 1000,
    z: Math.round(20 - 5 * d),
  };
}

// Onde fica o destaque, em px a partir da borda esquerda da fileira visível. Ele caminha com a
// rolagem: no começo, no meio do 1º item; no fim, no meio do último (pedido do usuário: os primeiros
// também ganham destaque, sem vazio antes deles). Fileira sem rolagem: no primeiro.
export function discFocus({ scrollLeft, maxScroll, viewWidth, itemWidth }) {
  const progress = maxScroll > 0 ? Math.min(Math.max(scrollLeft / maxScroll, 0), 1) : 0;
  return itemWidth / 2 + (viewWidth - itemWidth) * progress;
}

// Rolagem que põe o item de centro `itemCenter` (em px desde o começo do conteúdo) exatamente no
// destaque: itemCenter = s + itemWidth/2 + (viewWidth - itemWidth) * s / maxScroll
export function discSnap(itemCenter, { maxScroll, viewWidth, itemWidth }) {
  if (maxScroll <= 0) return 0;
  const s = (itemCenter - itemWidth / 2) / (1 + (viewWidth - itemWidth) / maxScroll);
  return Math.min(Math.max(s, 0), maxScroll);
}
