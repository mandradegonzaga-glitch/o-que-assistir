import { describe, it, expect } from '@jest/globals';
import { computeMatches, decodeMatchInvite, encodeMatchInvite, invitePayload, parseInvitePayload, pickTitles, playerName } from '../../src/domain/match.js';

const titles = [1, 2, 3, 4].map(id => ({ id, poster_path: `/${id}.jpg` }));

describe('computeMatches', () => {
  it('keeps only what both wanted, in order', () => {
    expect(computeMatches(titles, new Set([4, 2, 1]), new Set([2, 4])).map(t => t.id)).toEqual([2, 4]);
  });

  it('is empty when nothing matches', () => {
    expect(computeMatches(titles, new Set([1]), new Set([2]))).toEqual([]);
  });
});

describe('pickTitles', () => {
  it('drops titles without poster and ignored ones', () => {
    const list = [...titles, { id: 5, poster_path: null }];
    expect(pickTitles(list, [1], 12).map(t => t.id).sort()).toEqual([2, 3, 4]);
  });

  it('respects the size and does not change the input', () => {
    const list = [...titles];
    expect(pickTitles(list, [], 2)).toHaveLength(2);
    expect(list).toEqual(titles);
  });
});

describe('playerName', () => {
  it('uses a default for empty names', () => {
    expect(playerName('  ', 1)).toBe('Pessoa 2');
    expect(playerName(' Ana ', 0)).toBe('Ana');
  });
});

describe('match invite link', () => {
  const invite = { type: 'tv', ids: [10, 20, 30], nameA: 'Conceição', votesA: [0, 2] };
  const encode = obj => btoa(JSON.stringify(obj));

  it('round-trips the invitation, with accents', () => {
    expect(decodeMatchInvite(encodeMatchInvite(invite))).toEqual({ ...invite, nameB: null, votesB: null });
  });

  it('round-trips the answer', () => {
    const answer = { ...invite, nameB: 'Bia', votesB: [] };
    expect(decodeMatchInvite(encodeMatchInvite(answer))).toEqual(answer);
  });

  it('is safe for URLs', () => {
    expect(encodeMatchInvite({ ...invite, nameA: '???>>>~~~ção' })).toMatch(/^[\w-]+$/);
  });

  it.each([
    ['not base64', '%%%'],
    ['not JSON', btoa('oi')],
    ['unknown type', encode({ t: 'x', i: [1, 2], a: 'A', x: [] })],
    ['too few titles', encode({ t: 'tv', i: [1], a: 'A', x: [] })],
    ['too many titles', encode({ t: 'tv', i: Array.from({ length: 50 }, (_, n) => n + 1), a: 'A', x: [] })],
    ['invalid id', encode({ t: 'tv', i: [1, '2'], a: 'A', x: [] })],
    ['vote out of range', encode({ t: 'tv', i: [1, 2], a: 'A', x: [5] })],
    ['invalid second vote', encode({ t: 'tv', i: [1, 2], a: 'A', x: [], y: 'z' })],
  ])('rejects %s', (_label, code) => {
    expect(decodeMatchInvite(code)).toBe(null);
  });

  it('limits and defaults names', () => {
    const long = decodeMatchInvite(encode({ t: 'tv', i: [1, 2], a: 'x'.repeat(99), x: [] }));
    expect(long.nameA).toHaveLength(20);
    expect(decodeMatchInvite(encode({ t: 'tv', i: [1, 2], a: 5, x: [] })).nameA).toBe('Pessoa 1');
  });
});

describe('convite pela caixa de amigos', () => {
  it('ao vivo vai com o prefixo e volta para o parâmetro ao-vivo', () => {
    expect(invitePayload({ code: 'K7Q2', live: true })).toBe('ao-vivo:K7Q2');
    expect(parseInvitePayload('ao-vivo:K7Q2')).toEqual({ live: true, code: 'K7Q2', param: 'ao-vivo' });
  });

  it('o convite por link vai só com o código e volta para o parâmetro match', () => {
    expect(invitePayload({ code: 'abc123' })).toBe('abc123');
    expect(parseInvitePayload('abc123')).toEqual({ live: false, code: 'abc123', param: 'match' });
  });
});
