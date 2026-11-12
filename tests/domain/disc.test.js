import { describe, it, expect } from '@jest/globals';
import { discFocus, discPose, discSnap } from '../../src/domain/disc.js';

// Carrossel em disco do "Parecidos" (clleancode): o do centro grande e inteiro; os vizinhos menores
// e mais apagados; a partir de 2 posições de distância, para de diminuir
describe('discPose', () => {
  it('no centro: tamanho e opacidade cheios, por cima de todos', () => {
    expect(discPose(0)).toEqual({ scale: 1, opacity: 1, z: 20 });
  });

  it('um ao lado: 88% e 55% de opacidade, dos dois lados igual', () => {
    expect(discPose(1)).toEqual({ scale: 0.88, opacity: 0.55, z: 15 });
    expect(discPose(-1)).toEqual(discPose(1));
  });

  it('longe: para em 2 posições (76%), sem sumir de vez', () => {
    expect(discPose(2)).toEqual({ scale: 0.76, opacity: 0.35, z: 10 });
    expect(discPose(7)).toEqual(discPose(2));
  });

  it('entre posições, o meio do caminho', () => {
    expect(discPose(0.5).scale).toBeCloseTo(0.94);
    expect(discPose(0.5).opacity).toBeCloseTo(0.775);
  });
});

// Ponto de destaque que caminha com a rolagem (pedido do usuário: os primeiros também ganham destaque,
// sem vazio antes do primeiro): no começo fica no meio do 1º item, no fim no meio do último
describe('discFocus / discSnap', () => {
  const view = { viewWidth: 340, itemWidth: 128, maxScroll: 400 };

  it('no começo, no meio do primeiro; no fim, no meio do último', () => {
    expect(discFocus({ ...view, scrollLeft: 0 })).toBe(64);
    expect(discFocus({ ...view, scrollLeft: 400 })).toBe(340 - 64);
    expect(discFocus({ ...view, scrollLeft: 200 })).toBe(170);
  });

  it('fileira que cabe inteira (sem rolagem): o destaque fica no primeiro', () => {
    expect(discFocus({ ...view, maxScroll: 0, scrollLeft: 0 })).toBe(64);
  });

  it('o encaixe leva o item escolhido exatamente para o ponto de destaque', () => {
    for (const center of [64, 204, 344, 620]) {
      const scrollLeft = discSnap(center, view);
      expect(scrollLeft + discFocus({ ...view, scrollLeft })).toBeCloseTo(center, 5);
    }
    expect(discSnap(5000, view)).toBe(400); // não passa do fim
    expect(discSnap(0, view)).toBe(0);
  });
});
