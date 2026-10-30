import { describe, it, expect, beforeEach } from '@jest/globals';
import { MemoryCache } from '../../src/utils/cache.js';

describe('MemoryCache', () => {
  let cache;

  beforeEach(() => {
    cache = new MemoryCache(1000);
  });

  it('returns null for unknown key', () => {
    expect(cache.get('missing')).toBeNull();
  });

  it('set then get returns the value', () => {
    cache.set('key', { data: 42 });
    expect(cache.get('key')).toEqual({ data: 42 });
  });

  it('returns null after TTL expires', () => {
    const realNow = Date.now;
    let fakeTime = 1000;
    Date.now = () => fakeTime;

    cache.set('x', 'value', 500);
    fakeTime = 1600; // 600ms later — expired
    expect(cache.get('x')).toBeNull();

    Date.now = realNow;
  });

  it('returns value before TTL expires', () => {
    const realNow = Date.now;
    let fakeTime = 1000;
    Date.now = () => fakeTime;

    cache.set('x', 'value', 500);
    fakeTime = 1400; // 400ms later — still valid
    expect(cache.get('x')).toBe('value');

    Date.now = realNow;
  });

  it('delete removes the key', () => {
    cache.set('key', 'val');
    cache.delete('key');
    expect(cache.get('key')).toBeNull();
  });

  it('clear removes all keys', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  it('stores different values for different keys', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });
});
