import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'coverage/', 'test-results/', 'playwright-report/', '.claude/', '.sedd/', 'supabase/', 'src/vendor/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'sw.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } },
  },
  {
    files: ['tests/**/*.js', 'tests/**/*.mjs', 'config/**/*.js', 'scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-empty-pattern': 'off' }, // fixtures do Playwright exigem {}
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none', destructuredArrayIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
