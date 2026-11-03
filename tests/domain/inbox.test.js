import { describe, it, expect } from '@jest/globals';
import { diffInbox, inboxSnapshot, summarizeNews } from '../../src/domain/inbox.js';

const friend = (id, status, direction, name = 'Bia') => ({ friendship_id: id, other_id: `u-${id}`, username: name.toLowerCase(), display_name: name, status, direction });
const snap = data => inboxSnapshot(data);

describe('diffInbox', () => {
  it('a primeira leitura não avisa nada', () => {
    expect(diffInbox(null, snap({ shares: [{ id: 's1', from_name: 'Bia', title: 'Matrix' }] }))).toEqual([]);
  });

  it('avisa indicação, convite, pedido e aceite novos', () => {
    const before = snap({ friends: [friend('f1', 'pending', 'sent', 'Cau')] });
    const after = snap({
      friends: [friend('f1', 'accepted', 'sent', 'Cau'), friend('f2', 'pending', 'received', 'Dani')],
      shares: [{ id: 's1', from_name: 'Bia', title: 'Matrix' }],
      invites: [{ id: 'i1', from_name: 'Bia', payload: 'abc' }, { id: 'i2', from_name: 'Eva', payload: 'ao-vivo:K7P2QX' }],
    });
    expect(diffInbox(before, after).map(n => n.text)).toEqual([
      'Bia te indicou Matrix',
      'Bia te chamou para um Match',
      'Eva te chamou para um Match ao vivo',
      'Dani te enviou um pedido de amizade',
      'Cau aceitou seu pedido de amizade',
    ]);
  });

  it('o que já estava lá não avisa de novo', () => {
    const data = { shares: [{ id: 's1', from_name: 'Bia', title: 'Matrix' }], friends: [friend('f2', 'pending', 'received')] };
    expect(diffInbox(snap(data), snap(data))).toEqual([]);
  });

  it('aceitar um pedido recebido ou apagar uma indicação não vira aviso', () => {
    const before = snap({ friends: [friend('f2', 'pending', 'received')], shares: [{ id: 's1', from_name: 'Bia', title: 'X' }] });
    const after = snap({ friends: [friend('f2', 'accepted', 'received')] });
    expect(diffInbox(before, after)).toEqual([]);
  });

  it('nome em falta vira "Alguém"', () => {
    const after = snap({ friends: [{ friendship_id: 'f9', status: 'pending', direction: 'received' }] });
    expect(diffInbox(snap({}), after)[0].text).toBe('Alguém te enviou um pedido de amizade');
  });
});

describe('summarizeNews', () => {
  it('uma, várias ou nenhuma', () => {
    expect(summarizeNews([])).toBeNull();
    expect(summarizeNews([{ text: 'A' }])).toBe('A');
    expect(summarizeNews([{ text: 'A' }, { text: 'B' }])).toBe('A e mais 1 novidade em Amigos');
    expect(summarizeNews([{ text: 'A' }, { text: 'B' }, { text: 'C' }])).toBe('A e mais 2 novidades em Amigos');
  });
});
