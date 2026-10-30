/**
 * TypeScript interfaces for qualidade-a11y-seguranca
 * Feature ID: 008
 */

/** Entrada de histórico — `watchedAt` passou a ser lido de watch_history.watched_at (T001-009) */
export interface HistoryEntry {
  id: number;
  title: string;
  poster: string | null;
  type: 'movie' | 'tv' | 'dorama';
  year: string;
  genres: number[];
  watchedAt?: string; // ISO 8601
}

/** src/utils/escapeHtml.js */
export type EscapeHtml = (value: unknown) => string;

/** src/domain/badges.js — madrugada = 0h às 4h59 no horário local */
export type IsNightOwlWatch = (entry: Pick<HistoryEntry, 'watchedAt'> | null | undefined) => boolean;
