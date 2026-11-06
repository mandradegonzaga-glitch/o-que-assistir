import { describe, it, expect } from '@jest/globals';
import {
  DEFAULT_EMOJI, MAX_ITEMS, MAX_LISTS, buildLists, cleanListName, hasItem, listNameError,
  normalizeGuestLists, pickEmoji, toListItem, withItem, withoutItem,
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
        { id: 694, title: 'O Iluminado', poster: '/i.jpg', type: 'movie' },
        { id: 694, title: 'repetido' },
        { id: 'x' },
        { id: 1, title: 'Hack', poster: 'https://evil.dev/a.jpg', type: 'person' },
      ] },
      { id: 'g2', name: 'TERROR', items: [] }, // mesmo nome: fica a primeira
      { id: 'g3', name: '   ' },
      null,
    ]);
    expect(lists).toEqual([{ id: 'g1', name: 'Terror', emoji: '👻', items: [
      { id: 694, title: 'O Iluminado', poster: '/i.jpg', type: 'movie' },
      { id: 1, title: 'Hack', poster: null, type: 'movie' },
    ] }]);
    expect(normalizeGuestLists('lixo')).toEqual([]);
  });

  it('builds the lists from the database rows', () => {
    const lists = buildLists(
      [{ id: 'l1', name: 'Terror', emoji: '👻' }, { id: 'l2', name: 'Vazia', emoji: '??' }],
      [
        { list_id: 'l1', tmdb_id: 694, title: 'O Iluminado', poster_path: '/i.jpg', media_type: 'movie' },
        { list_id: 'sumiu', tmdb_id: 1, title: 'Órfão', poster_path: null, media_type: 'movie' },
      ],
    );
    expect(lists).toEqual([
      { id: 'l1', name: 'Terror', emoji: '👻', items: [{ id: 694, title: 'O Iluminado', poster: '/i.jpg', type: 'movie' }] },
      { id: 'l2', name: 'Vazia', emoji: DEFAULT_EMOJI, items: [] },
    ]);
  });
});
