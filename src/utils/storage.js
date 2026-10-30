export const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  getRaw(key, fallback = null) {
    return localStorage.getItem(key) ?? fallback;
  },
  setRaw(key, value) {
    localStorage.setItem(key, String(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};
