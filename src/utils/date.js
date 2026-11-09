// Dias como texto "AAAA-MM-DD". O dia é o do fuso da pessoa: a virada é à meia-noite dela, não em UTC.
export const DAY_MS = 86_400_000;

export function localDay(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Número do dia desde 1970: dias seguidos dão números seguidos, sem horário de verão no meio
export function dayNumber(day) {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function dayFromNumber(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return dayNumber(to) - dayNumber(from);
}
