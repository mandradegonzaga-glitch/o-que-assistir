import { describe, it, expect } from '@jest/globals';
import { passwordError, passwordLevel } from '../../src/domain/passwordStrength.js';

describe('passwordLevel', () => {
  it('sem senha, ou só letras minúsculas, é fraca', () => {
    expect(passwordLevel('')).toBe('weak');
    expect(passwordLevel()).toBe('weak');
    expect(passwordLevel('abc')).toBe('weak');
    expect(passwordLevel('abcdefgh')).toBe('weak');
  });

  it('comprida com maiúsculas e minúsculas é média', () => {
    expect(passwordLevel('Abcdefgh')).toBe('medium');
  });

  it('com número ou símbolo a mais é forte', () => {
    expect(passwordLevel('Abcdefg1')).toBe('strong');
    expect(passwordLevel('Abcdef1!')).toBe('strong');
  });

  it('variedade não compensa uma senha curta demais', () => {
    expect(passwordLevel('A1!')).toBe('weak');
  });
});

it('senha nova: curta, diferente da confirmação ou certa', () => {
  expect(passwordError('12345', '12345')).toMatch(/pelo menos 6/);
  expect(passwordError('123456', '123457')).toBe('As senhas não coincidem');
  expect(passwordError('123456', '123456')).toBeNull();
});
