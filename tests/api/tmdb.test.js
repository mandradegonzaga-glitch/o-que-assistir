import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { buildTmdbUrl, tmdbGet, latestSignal, isAbortError, clearTmdbCache, TmdbError } from '../../src/api/tmdb.js';

const ok = body => ({ ok: true, status: 200, json: async () => body });

describe('buildTmdbUrl', () => {
  it('goes through the proxy, in pt-BR by default', () => {
    const url = new URL(buildTmdbUrl('/movie/1'));
    expect(url.pathname).toBe('/functions/v1/tmdb/movie/1');
    expect(url.searchParams.get('language')).toBe('pt-BR');
    expect(url.searchParams.has('api_key')).toBe(false); // a chave só existe no servidor
  });

  it('omits language when null and skips empty params', () => {
    const url = new URL(buildTmdbUrl('/x', { language: null, a: '', b: null, c: 0 }));
    expect(url.searchParams.has('language')).toBe(false);
    expect(url.searchParams.has('a')).toBe(false);
    expect(url.searchParams.has('b')).toBe(false);
    expect(url.searchParams.get('c')).toBe('0');
  });

  it('encodes special characters', () => {
    const url = new URL(buildTmdbUrl('/search/movie', { query: "Ocean's 11 & #1" }));
    expect(url.searchParams.get('query')).toBe("Ocean's 11 & #1");
  });
});

describe('tmdbGet', () => {
  beforeEach(() => {
    clearTmdbCache();
    global.fetch = jest.fn();
  });
  afterEach(() => { delete global.fetch; });

  it('caches successful responses', async () => {
    global.fetch.mockResolvedValue(ok({ id: 1 }));
    await tmdbGet('/movie/1');
    const second = await tmdbGet('/movie/1');
    expect(second).toEqual({ id: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws TmdbError on HTTP failure and does not cache it', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(tmdbGet('/movie/2')).rejects.toBeInstanceOf(TmdbError);
    global.fetch.mockResolvedValueOnce(ok({ id: 2 }));
    await expect(tmdbGet('/movie/2')).resolves.toEqual({ id: 2 });
  });

  it('passes the abort signal to fetch', async () => {
    global.fetch.mockResolvedValue(ok({}));
    const signal = latestSignal('t');
    await tmdbGet('/movie/3', {}, { signal });
    expect(global.fetch.mock.calls[0][1].signal).toBe(signal);
  });
});

describe('latestSignal', () => {
  it('aborts the previous request on the same channel only', () => {
    const first = latestSignal('a');
    const other = latestSignal('b');
    const second = latestSignal('a');
    expect(first.aborted).toBe(true);
    expect(other.aborted).toBe(false);
    expect(second.aborted).toBe(false);
  });
});

describe('isAbortError', () => {
  it('recognizes only AbortError', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
