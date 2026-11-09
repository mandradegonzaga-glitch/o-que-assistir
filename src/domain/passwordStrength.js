// Nível da barra de força no cadastro: 'weak', 'medium' ou 'strong'
export function passwordLevel(password = '') {
  const points = [
    password.length >= 4,
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;
  return points <= 2 ? 'weak' : points === 3 ? 'medium' : 'strong';
}

// Regras do formulário de conta (cadastro, troca de senha, recuperar senha)
export const MIN_PASSWORD_LENGTH = 6;

// Senha nova (cadastro ou troca): o aviso a mostrar, ou null se está tudo certo
export function passwordError(password, confirm) {
  if (password.length < MIN_PASSWORD_LENGTH) return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres!`;
  if (password !== confirm) return 'As senhas não coincidem!';
  return null;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
