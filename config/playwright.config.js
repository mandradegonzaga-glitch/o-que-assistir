import { defineConfig } from '@playwright/test';

// Usa o Chrome instalado na máquina (não baixa navegador). Supabase e TMDB são simulados
// em tests/e2e/support: os testes não dependem de rede nem tocam no banco real.
export default defineConfig({
  testDir: '../tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  outputDir: '../test-results',
  use: {
    baseURL: 'http://localhost:5175',
    channel: 'chrome',
    serviceWorkers: 'block',
    locale: 'pt-BR',
  },
  webServer: {
    command: 'npx -y http-server -p 5175 -c-1 --silent',
    cwd: '..',
    url: 'http://localhost:5175/index.html',
    reuseExistingServer: true,
  },
});
