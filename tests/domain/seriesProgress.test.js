import { describe, it, expect } from '@jest/globals';
import {
  getNextEpisode,
  calcProgressPercent,
  buildEpisodeKey,
  parseEpisodeKey,
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

// Todas as seasons da série (sem season 0)
const allSeasons = [season1, season2];

// Helper: gera Set de chaves assistidas
function watched(...pairs) {
  return new Set(pairs.map(([s, e]) => buildEpisodeKey(1, s, e)));
}

describe('buildEpisodeKey / parseEpisodeKey', () => {
  it('a chave volta para os mesmos números (é o formato gravado no banco e no aparelho)', () => {
    expect(parseEpisodeKey(buildEpisodeKey(99999, 10, 22))).toEqual({ seriesId: 99999, season: 10, episode: 22 });
    expect(parseEpisodeKey(buildEpisodeKey(1, 0, 1))).toEqual({ seriesId: 1, season: 0, episode: 1 });
  });

  it('chave fora do formato não vira episódio', () => {
    expect(parseEpisodeKey('123-s1')).toBeNull();
    expect(parseEpisodeKey('abc-s1-e2')).toBeNull();
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
