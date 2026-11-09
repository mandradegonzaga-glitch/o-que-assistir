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
  // Texto puro, para chaves gravadas antes do JSON ('movie', '1', 'true')
  getText(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setText(key, value) {
    try { localStorage.setItem(key, String(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  }
};
