// Onda de pontos do "Deu Match!" (efeito do clleancode, repasse da etapa 5): numa grade, cada ponto
// surge com um atraso proporcional à distância até o centro, e os de longe começam maiores.
// Números do site de referência: a onda inteira leva 0,42 s; a escala inicial vai de 0,55 a 0,9.
export const WAVE_SPREAD_S = 0.42;
const FROM_NEAR = 0.55;
const FROM_FAR = 0.9;

const round = n => Math.round(n * 1000) / 1000;

export function waveCells(cols, rows) {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const max = Math.hypot(cx, cy) || 1;
  return Array.from({ length: cols * rows }, (_, i) => {
    const t = Math.hypot((i % cols) - cx, Math.floor(i / cols) - cy) / max;
    return { delay: round(WAVE_SPREAD_S * t), from: round(FROM_NEAR + (FROM_FAR - FROM_NEAR) * t) };
  });
}
