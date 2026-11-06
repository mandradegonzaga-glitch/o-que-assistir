import { describe, it, expect } from '@jest/globals';
import { COLLECTIONS, collectionById, collectionItems, collectionKind, collectionPath } from '../../src/domain/collections.js';
import { LIST_EMOJIS, LIST_TEMPLATES, availableTemplates, findListByName } from '../../src/domain/userLists.js';

describe('coleções prontas', () => {
  it('têm ids únicos e emojis que o seletor aceita', () => {
    expect(new Set(COLLECTIONS.map(c => c.id)).size).toBe(COLLECTIONS.length);
    COLLECTIONS.forEach(c => expect(LIST_EMOJIS).toContain(c.emoji));
    LIST_TEMPLATES.forEach(t => expect(LIST_EMOJIS).toContain(t.emoji));
  });

  it('buscam os mais bem avaliados; dorama é série coreana', () => {
    const dorama = collectionById('doramas');
    expect(collectionPath(dorama)).toBe('/discover/tv');
    expect(dorama.params).toMatchObject({ sort_by: 'vote_average.desc', with_origin_country: 'KR' });
    expect(collectionPath(collectionById('terror'))).toBe('/discover/movie');
    expect(collectionKind(dorama)).toBe('Doramas');
    expect(collectionById('nada')).toBeNull();
  });

  it('ficam só com títulos com pôster, nome legível e sem repetir', () => {
    const items = collectionItems(collectionById('doramas'), [
      { id: 1, name: 'Pousando no Amor', poster_path: '/a.jpg' },
      { id: 1, name: 'Pousando no Amor', poster_path: '/a.jpg' },
      { id: 2, name: '사랑의 불시착', poster_path: '/b.jpg' },
      { id: 3, name: 'Sem pôster', poster_path: null },
    ]);
    expect(items).toEqual([{ id: 1, title: 'Pousando no Amor', poster: '/a.jpg', type: 'dorama' }]);
    expect(collectionItems(collectionById('terror'))).toEqual([]);
  });
});

describe('modelos de lista', () => {
  it('somem quando a pessoa já tem uma lista com o mesmo nome', () => {
    const lists = [{ id: 'a', name: '  favoritos ', emoji: '🏆', items: [] }];
    expect(findListByName(lists, 'FAVORITOS')?.id).toBe('a');
    expect(availableTemplates(lists).map(t => t.name)).not.toContain('Favoritos');
    expect(availableTemplates([])).toHaveLength(LIST_TEMPLATES.length);
  });
});
