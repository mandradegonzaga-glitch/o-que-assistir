// Elenco e equipe da página do título, a partir dos créditos e dos detalhes do TMDB

export function castMembers(credits, max = 10) {
  return (credits?.cast || []).slice(0, max).map(person => ({
    id: person.id,
    name: person.name,
    character: person.character || '',
    photo: person.profile_path || null,
  }));
}

const CREW_JOBS = [
  { label: 'Direção', jobs: ['Director'] },
  { label: 'Roteiro', jobs: ['Screenplay', 'Writer'] },
];

// "Direção: X · Roteiro: Y" no filme. Série: "Criação", que o TMDB manda nos detalhes (created_by);
// os créditos de série quase nunca trazem diretor. No máximo 2 nomes por função, sem repetir.
export function crewLine(credits, details) {
  const crew = credits?.crew || [];
  const lines = CREW_JOBS.map(({ label, jobs }) => ({
    label,
    names: [...new Set(crew.filter(c => jobs.includes(c.job)).map(c => c.name))].slice(0, 2),
  }));
  const creators = (details?.created_by || []).map(c => c.name).slice(0, 2);
  if (creators.length) lines.unshift({ label: 'Criação', names: creators });
  return lines.filter(line => line.names.length);
}

// "Ryan Gosling" → "RG": primeira letra do primeiro e do último nome
export function initials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = words[0][0];
  return (words.length > 1 ? first + words[words.length - 1][0] : first).toUpperCase();
}
