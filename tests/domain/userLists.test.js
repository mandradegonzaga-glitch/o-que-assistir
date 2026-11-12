import { describe, it, expect } from '@jest/globals';
import {
  DEFAULT_EMOJI, MAX_ITEMS, MAX_LISTS, buildLists, cleanListName, hasItem, listNameError,
  isShareToken, moveItem, normalizeGuestLists, pickEmoji, sharedListFrom, toListItem, withItem, withoutItem,
} from '../../src/domain/userLists.js';

const list = (id, name, items = []) => ({ id, name, emoji: '🎃', items });

describe('userLists', () => {
  it('cleans names: trims, joins spaces and cuts at 40 letters', () => {
    expect(cleanListName('  Maratona   Halloween ')).toBe('Maratona Halloween');
    expect(cleanListName('x'.repeat(50))).toHaveLength(40);
    expect(cleanListName(null)).toBe('');
  });

  it('refuses empty and repeated names, ignoring case and spaces', () => {
    const lists = [list('a', 'Comédias'), list('b', 'Terror')];
    expect(listNameError('   ', lists)).toBe('Dê um nome para a lista.');
    expect(listNameError(' COMÉDIAS ', lists)).toBe('Você já tem uma lista com esse nome.');
    expect(listNameError('Romance', lists)).toBeNull();
    // Renomear a própria lista com o mesmo nome (ou outra caixa) pode
    expect(listNameError('comédias', lists, 'a')).toBeNull();
    expect(listNameError('Terror', lists, 'a')).toBe('Você já tem uma lista com esse nome.');
  });

  it('stops at the list limit, but still lets a list be renamed', () => {
    const many = Array.from({ length: MAX_LISTS }, (_, i) => list(String(i), `Lista ${i}`));
    expect(listNameError('Nova', many)).toMatch(/limite de 50 listas/);
    expect(listNameError('Nova', many, '0')).toBeNull();
  });

  it('only accepts emojis from the picker', () => {
    expect(pickEmoji('🎃')).toBe('🎃');
    expect(pickEmoji('<b>')).toBe(DEFAULT_EMOJI);
    expect(pickEmoji(undefined)).toBe(DEFAULT_EMOJI);
  });

  it('turns a TMDB title or a library item into a list item', () => {
    expect(toListItem({ id: 1, name: 'Dark', poster_path: '/d.jpg', media_type: 'tv' }))
      .toEqual({ id: 1, title: 'Dark', poster: '/d.jpg', type: 'tv' });
    expect(toListItem({ id: 2, title: 'Matrix', poster: '/m.jpg', type: 'movie' }))
      .toEqual({ id: 2, title: 'Matrix', poster: '/m.jpg', type: 'movie' });
    expect(toListItem({ id: 3, title: 'Doce Lar' }, 'dorama').type).toBe('dorama');
    expect(toListItem({ id: 4, title: 'X', media_type: 'person' }).type).toBe('movie');
  });

  it('adds once, removes, and never changes the original list', () => {
    const original = list('a', 'Terror');
    const once = withItem(original, { id: 694, title: 'O Iluminado' });
    expect(original.items).toEqual([]);
    expect(hasItem(once, 694)).toBe(true);
    expect(withItem(once, { id: 694, title: 'O Iluminado' })).toBe(once);
    expect(withoutItem(once, 694).items).toEqual([]);
  });

  it('stops adding at the item limit', () => {
    const full = list('a', 'Cheia', Array.from({ length: MAX_ITEMS }, (_, i) => ({ id: i + 1 })));
    expect(withItem(full, { id: 99999 })).toBe(full);
  });

  it('cleans the guest lists before the import', () => {
    const lists = normalizeGuestLists([
      { id: 'g1', name: ' Terror ', emoji: '👻', items: [
        { id: 694, title: 'O Iluminado', poster: '/i.jpg', type: 'movie', rating: 8.4 },
        { id: 694, title: 'repetido' },
        { id: 'x' },
        { id: 1, title: 'Hack', poster: 'https://evil.dev/a.jpg', type: 'person' },
      ] },
      { id: 'g2', name: 'TERROR', items: [] }, // mesmo nome: fica a primeira
      { id: 'g3', name: '   ' },
      null,
    ]);
    expect(lists).toEqual([{ id: 'g1', name: 'Terror', emoji: '👻', items: [
      { id: 694, title: 'O Iluminado', poster: '/i.jpg', type: 'movie', rating: 8.4 },
      { id: 1, title: 'Hack', poster: null, type: 'movie' },
    ] }]);
    expect(normalizeGuestLists('lixo')).toEqual([]);
  });

  it('builds the lists from the database rows', () => {
    const lists = buildLists(
      [{ id: 'l1', name: 'Terror', emoji: '👻' }, { id: 'l2', name: 'Vazia', emoji: '??' }],
      [
        { list_id: 'l1', tmdb_id: 694, title: 'O Iluminado', poster_path: '/i.jpg', media_type: 'movie', vote_average: 8.4 },
        { list_id: 'sumiu', tmdb_id: 1, title: 'Órfão', poster_path: null, media_type: 'movie' },
      ],
    );
    expect(lists).toEqual([
      { id: 'l1', name: 'Terror', emoji: '👻', shareToken: null, items: [{ id: 694, title: 'O Iluminado', poster: '/i.jpg', type: 'movie', rating: 8.4 }] },
      { id: 'l2', name: 'Vazia', emoji: DEFAULT_EMOJI, shareToken: null, items: [] },
    ]);
  });

  it('orders by the chosen position; titles without one go last, in arrival order', () => {
    const row = (id, position) => ({ list_id: 'l', tmdb_id: id, title: `T${id}`, poster_path: null, media_type: 'movie', position });
    const [l] = buildLists([{ id: 'l', name: 'L', emoji: '🎬', share_token: 'tok' }], [row(1, 3), row(2, null), row(3, 1), row(4, 2), row(5, null)]);
    expect(l.items.map(i => i.id)).toEqual([3, 4, 1, 2, 5]);
    expect(l.shareToken).toBe('tok');
  });

  it('moves a title, ignoring positions outside the list', () => {
    const l = list('a', 'L', [{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(moveItem(l, 0, 2).items.map(i => i.id)).toEqual([2, 3, 1]);
    expect(moveItem(l, 2, 0).items.map(i => i.id)).toEqual([3, 1, 2]);
    expect(l.items.map(i => i.id)).toEqual([1, 2, 3]);
    expect(moveItem(l, 0, -1)).toBe(l);
    expect(moveItem(l, 1, 3)).toBe(l);
    expect(moveItem(l, 1, 1)).toBe(l);
  });

  it('only accepts a UUID as share token', () => {
    expect(isShareToken('3f2a6c1e-8b7d-4e2f-9a1b-0c3d4e5f6a7b')).toBe(true);
    expect(isShareToken('abc')).toBe(false);
    expect(isShareToken('<script>')).toBe(false);
    expect(isShareToken(null)).toBe(false);
  });

  it('reads the shared list from the server, cleaning what comes in', () => {
    expect(sharedListFrom(null)).toBeNull();
    expect(sharedListFrom({ name: 'x' })).toBeNull();
    const l = sharedListFrom({
      name: ' Para a Bia ', emoji: '<b>', owner: 'Ana', is_mine: false, list_id: null,
      items: [{ tmdb_id: 3, title: 'Três', poster_path: '/3.jpg', media_type: 'tv' }, { tmdb_id: 1, title: 'Um', poster_path: 'http://x/a.jpg', media_type: 'movie' }],
    });
    expect(l).toEqual({
      name: 'Para a Bia', emoji: DEFAULT_EMOJI, owner: 'Ana', isMine: false, listId: null,
      items: [{ id: 3, title: 'Três', poster: '/3.jpg', type: 'tv' }, { id: 1, title: 'Um', poster: null, type: 'movie' }],
    });
  });
});
