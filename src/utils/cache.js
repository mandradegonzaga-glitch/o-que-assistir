export class MemoryCache {
  constructor(defaultTtl = 300_000) {
    this._data = new Map();
    this._defaultTtl = defaultTtl;
  }

  set(key, value, ttl = this._defaultTtl) {
    this._data.set(key, { value, expiry: Date.now() + ttl });
  }

  get(key) {
    const item = this._data.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this._data.delete(key);
      return null;
    }
    return item.value;
  }

  delete(key) {
    this._data.delete(key);
  }

  clear() {
    this._data.clear();
  }
}

export const cache = new MemoryCache();
