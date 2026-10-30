export function scorePassword(password) {
  if (!password) return { score: 0, level: 'weak' };

  let score = 0;
  if (password.length >= 4) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const level = score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
  return { score, level };
}
