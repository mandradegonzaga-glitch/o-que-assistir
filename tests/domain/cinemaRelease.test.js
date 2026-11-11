import { describe, it, expect } from '@jest/globals';
import { brCertification, cinemaLabel, cinemaStatus, formatPremiere, IN_THEATERS_DAYS } from '../../src/domain/cinemaRelease.js';

const TODAY = '2026-11-07';
const dates = (country, list) => ({
  results: [
    { iso_3166_1: 'US', release_dates: [{ type: 3, release_date: '2026-01-01T00:00:00.000Z' }] },
    { iso_3166_1: country, release_dates: list.map(([type, d]) => ({ type, release_date: `${d}T00:00:00.000Z` })) },
  ],
});

describe('nos cinemas / estreia (Brasil)', () => {
  it('estreia marcada no futuro', () => {
    expect(cinemaStatus(dates('BR', [[3, '2026-11-20']]), TODAY)).toEqual({ kind: 'soon', date: '2026-11-20' });
    expect(cinemaLabel({ kind: 'soon', date: '2026-11-20' }, TODAY)).toBe('Estreia nos cinemas em 20/11');
  });

  it('estreia no ano seguinte mostra o ano', () => {
    expect(formatPremiere('2027-01-15', TODAY)).toBe('15/01/2027');
  });

  it('em cartaz: estreou há pouco e ainda não saiu em casa', () => {
    expect(cinemaStatus(dates('BR', [[3, '2026-10-30']]), TODAY)).toEqual({ kind: 'now' });
    expect(cinemaStatus(dates('BR', [[3, TODAY]]), TODAY)).toEqual({ kind: 'now' });
    expect(cinemaLabel({ kind: 'now' })).toBe('Nos cinemas');
  });

  it('já saiu em digital no Brasil: não está mais "nos cinemas"', () => {
    expect(cinemaStatus(dates('BR', [[3, '2026-10-01'], [4, '2026-11-01']]), TODAY)).toBeNull();
  });

  it('digital marcado para depois de hoje não conta', () => {
    expect(cinemaStatus(dates('BR', [[3, '2026-10-01'], [4, '2026-12-01']]), TODAY)).toEqual({ kind: 'now' });
  });

  it(`estreou há mais de ${IN_THEATERS_DAYS} dias: provavelmente saiu de cartaz`, () => {
    expect(cinemaStatus(dates('BR', [[3, '2026-07-01']]), TODAY)).toBeNull();
  });

  it('usa o cinema limitado quando não há lançamento amplo', () => {
    expect(cinemaStatus(dates('BR', [[2, '2026-11-12']]), TODAY)).toEqual({ kind: 'soon', date: '2026-11-12' });
  });

  it('prefere o lançamento amplo ao limitado', () => {
    expect(cinemaStatus(dates('BR', [[2, '2026-10-01'], [3, '2026-11-12']]), TODAY)).toEqual({ kind: 'soon', date: '2026-11-12' });
  });

  it('sem data do Brasil ou sem dados: nada', () => {
    expect(cinemaStatus(dates('PT', [[3, '2026-11-20']]), TODAY)).toBeNull();
    expect(cinemaStatus(undefined, TODAY)).toBeNull();
    expect(cinemaStatus({ results: [{ iso_3166_1: 'BR', release_dates: [{ type: 3, release_date: '' }] }] }, TODAY)).toBeNull();
    expect(cinemaLabel(null)).toBe('');
  });
});

describe('classificação indicativa (Brasil)', () => {
  const br = list => ({ results: [
    { iso_3166_1: 'US', release_dates: [{ type: 3, certification: 'R' }] },
    { iso_3166_1: 'BR', release_dates: list },
  ] });

  it('usa a do cinema; sem ela, a primeira que houver', () => {
    expect(brCertification(br([{ type: 4, certification: '16' }, { type: 3, certification: '14' }]))).toBe('14');
    expect(brCertification(br([{ type: 4, certification: '' }, { type: 6, certification: 'L' }]))).toBe('L');
  });

  it('sem classificação do Brasil, nada (não usa a de outro país)', () => {
    expect(brCertification(br([{ type: 3, certification: '' }]))).toBe('');
    expect(brCertification({ results: [{ iso_3166_1: 'US', release_dates: [{ type: 3, certification: 'R' }] }] })).toBe('');
    expect(brCertification(undefined)).toBe('');
  });
});
