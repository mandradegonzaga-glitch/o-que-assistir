import { describe, it, expect } from '@jest/globals';
import { LIST_EMOJIS, LIST_TEMPLATES } from '../../src/domain/userLists.js';
import { COLLECTIONS } from '../../src/domain/collections.js';
import { listIcon, listIconInfo } from '../../src/ui/listIcons.js';
import { ph } from '../../src/ui/phosphor.js';

describe('ícones Phosphor', () => {
  it('desenha o SVG decorativo e não desenha nome que não foi gerado', () => {
    const svg = ph('dice-five');
    expect(svg).toMatch(/^<svg class="ph" aria-hidden="true" focusable="false" viewBox="0 0 256 256"/);
    expect(ph('dice-five', { weight: 'fill' })).toBe('');
    expect(ph('nao-existe')).toBe('');
  });

  it('todo emoji de lista, modelo e coleção tem ícone gerado, nome e cor', () => {
    const emojis = new Set([...LIST_EMOJIS, ...LIST_TEMPLATES.map(t => t.emoji), ...COLLECTIONS.map(c => c.emoji)]);
    for (const e of emojis) {
      const info = listIconInfo(e);
      expect(LIST_EMOJIS).toContain(e);
      expect(ph(info.icon)).not.toBe('');
      expect(info.label).toBeTruthy();
      expect(info.color).toBeTruthy();
    }
    // nomes do seletor não se repetem (o leitor de tela precisa distinguir)
    const labels = LIST_EMOJIS.map(e => listIconInfo(e).label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('emoji desconhecido (dado antigo) cai na claquete, sem quebrar', () => {
    expect(listIcon('🦄')).toContain('data-icon="film-slate"');
    expect(listIcon('🍿', 'x')).toMatch(/class="list-icon list-icon--ouro x" data-icon="popcorn" aria-hidden="true"/);
  });
});
