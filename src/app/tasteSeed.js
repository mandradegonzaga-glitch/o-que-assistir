// Gêneros escolhidos na primeira visita: guiam as Indicações do dia até o DNA se formar
// (src/domain/dailyPicks.js, pickProfile). Ficam no aparelho.
import { storage } from '../utils/storage.js';

const STORAGE_KEY = 'taste_seed';

export function getTasteSeed() {
  const saved = storage.get(STORAGE_KEY, []);
  return Array.isArray(saved) ? saved.filter(Number.isInteger) : [];
}

export const setTasteSeed = ids => storage.set(STORAGE_KEY, ids);
