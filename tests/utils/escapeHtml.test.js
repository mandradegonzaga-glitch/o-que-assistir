import { describe, it, expect } from '@jest/globals';
import { escapeHtml } from '../../src/utils/escapeHtml.js';

describe('escapeHtml', () => {
  it('escapes HTML tags', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes quotes so attributes cannot be broken', () => {
    expect(escapeHtml(`a" onmouseover="x' b`)).toBe('a&quot; onmouseover=&quot;x&#39; b');
  });

  it('escapes ampersand first, without double-encoding the others', () => {
    expect(escapeHtml('Tom & Jerry <3')).toBe('Tom &amp; Jerry &lt;3');
  });

  it('keeps plain text and accents unchanged', () => {
    expect(escapeHtml('Cidade de Deus — Ação')).toBe('Cidade de Deus — Ação');
  });

  it('returns empty string for null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('converts numbers to string', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});
