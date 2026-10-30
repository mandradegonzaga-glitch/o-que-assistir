import { describe, it, expect } from '@jest/globals';
import {
  getNextEpisode,
  calcProgressPercent,
  isSeriesCompleted,
  filterSeason0,
  buildEpisodeKey,
} from '../../src/domain/seriesProgress.js';

// Fixtures reutilizáveis
const season1 = {
  season_number: 1,
  episodes: [
    { season_number: 1, episode_number: 1 },
    { season_number: 1, episode_number: 2 },
    { season_number: 1, episode_number: 3 },
  ],
};

const season2 = {
  season_number: 2,
  episodes: [
    { season_number: 2, episode_number: 1 },
    { season_number: 2, episode_number: 2 },
  ],
};

const season0 = {
  season_number: 0,
  episodes: [
    { season_number: 0, episode_number: 1 },
  ],
};

// Todas as seasons da série (sem season 0)
const allSeasons = [season1, season2];

// Helper: gera Set de chaves assistidas
function watched(...pairs) {
  return new Set(pairs.map(([s, e]) => buildEpisodeKey(1, s, e)));
}

// ---------------------------------------------------------------------------
// buildEpisodeKey
// ---------------------------------------------------------------------------
describe('buildEpisodeKey', () => {
  it('retorna string no formato correto', () => {
    expect(buildEpisodeKey(123, 1, 5)).toBe('123-s1-e5');
  });

  it('trata IDs numéricos grandes', () => {
    expect(buildEpisodeKey(99999, 10, 22)).toBe('99999-s10-e22');
  });

  it('season 0 gera chave válida', () => {
    expect(buildEpisodeKey(1, 0, 1)).toBe('1-s0-e1');
  });
});

// ---------------------------------------------------------------------------
// filterSeason0
// ---------------------------------------------------------------------------
describe('filterSeason0', () => {
  it('remove a season 0 da lista', () => {
    const result = filterSeason0([season0, season1, season2]);
    expect(result).toHaveLength(2);
    expect(result.every(s => s.season_number !== 0)).toBe(true);
  });

  it('não remove seasons normais', () => {
    const result = filterSeason0([season1, season2]);
    expect(result).toHaveLength(2);
  });

  it('retorna array vazio para input vazio', () => {
    expect(filterSeason0([])).toEqual([]);
  });

  it('retorna array vazio se só existir season 0', () => {
    expect(filterSeason0([season0])).toEqual([]);
  });

  it('não muta o array original', () => {
    const original = [season0, season1];
    filterSeason0(original);
    expect(original).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getNextEpisode
// ---------------------------------------------------------------------------
describe('getNextEpisode', () => {
  it('retorna o primeiro episódio se nada foi assistido', () => {
    const result = getNextEpisode(new Set(), allSeasons, 1);
    expect(result).toEqual({ season_number: 1, episode_number: 1 });
  });

  it('retorna o próximo episódio da mesma temporada', () => {
    const w = watched([1, 1]);
    const result = getNextEpisode(w, allSeasons, 1);
    expect(result).toEqual({ season_number: 1, episode_number: 2 });
  });

  it('avança para a próxima temporada ao terminar uma', () => {
    const w = watched([1, 1], [1, 2], [1, 3]);
    const result = getNextEpisode(w, allSeasons, 1);
    expect(result).toEqual({ season_number: 2, episode_number: 1 });
  });

  it('retorna null se série completamente assistida', () => {
    const w = watched([1, 1], [1, 2], [1, 3], [2, 1], [2, 2]);
    const result = getNextEpisode(w, allSeasons, 1);
    expect(result).toBeNull();
  });

  it('funciona com episódios marcados fora de ordem', () => {
    // S01E01 e S01E03 assistidos, S01E02 não
    const w = watched([1, 1], [1, 3]);
    const result = getNextEpisode(w, allSeasons, 1);
    expect(result).toEqual({ season_number: 1, episode_number: 2 });
  });

  it('retorna null para série sem seasons', () => {
    const result = getNextEpisode(new Set(), [], 1);
    expect(result).toBeNull();
  });

  it('retorna null para seasons com lista de episódios vazia', () => {
    const emptySeason = [{ season_number: 1, episodes: [] }];
    const result = getNextEpisode(new Set(), emptySeason, 1);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calcProgressPercent
// ---------------------------------------------------------------------------
describe('calcProgressPercent', () => {
  it('retorna 0 se nada foi assistido', () => {
    expect(calcProgressPercent(new Set(), allSeasons, 1)).toBe(0);
  });

  it('retorna 100 se tudo foi assistido', () => {
    const w = watched([1, 1], [1, 2], [1, 3], [2, 1], [2, 2]);
    expect(calcProgressPercent(w, allSeasons, 1)).toBe(100);
  });

  it('retorna valor intermediário correto', () => {
    // 1 de 5 episódios = 20%
    const w = watched([1, 1]);
    expect(calcProgressPercent(w, allSeasons, 1)).toBe(20);
  });

  it('arredonda para inteiro', () => {
    // season1 tem 3 eps, 1 assistido = 33.33...%
    const w = watched([1, 1]);
    const result = calcProgressPercent(w, [season1], 1);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(33);
  });

  it('retorna 0 para série sem episódios', () => {
    expect(calcProgressPercent(new Set(), [], 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isSeriesCompleted
// ---------------------------------------------------------------------------
describe('isSeriesCompleted', () => {
  it('retorna false se nada foi assistido', () => {
    expect(isSeriesCompleted(new Set(), allSeasons, 1)).toBe(false);
  });

  it('retorna false se parcialmente assistido', () => {
    const w = watched([1, 1]);
    expect(isSeriesCompleted(w, allSeasons, 1)).toBe(false);
  });

  it('retorna true se todos os episódios foram assistidos', () => {
    const w = watched([1, 1], [1, 2], [1, 3], [2, 1], [2, 2]);
    expect(isSeriesCompleted(w, allSeasons, 1)).toBe(true);
  });

  it('retorna false para série sem seasons (indefinido)', () => {
    expect(isSeriesCompleted(new Set(), [], 1)).toBe(false);
  });

  it('retorna true para série de 1 ep com esse ep assistido', () => {
    const singleEp = [{ season_number: 1, episodes: [{ season_number: 1, episode_number: 1 }] }];
    const w = watched([1, 1]);
    expect(isSeriesCompleted(w, singleEp, 1)).toBe(true);
  });
});
