import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para a suíte E2E do RESOLVE.
 *
 * - O front-end (Next.js, pasta ../frontend) é subido automaticamente pelo
 *   `webServer` abaixo antes dos testes começarem, em http://localhost:3000.
 * - O front-end, por padrão (sem nenhuma env var extra), já fala com o
 *   backend publicado no Render (https://smart-city-6.onrender.com) — ver
 *   frontend/src/lib/api.ts. Ou seja, NÃO é preciso subir o backend local
 *   com Docker para rodar esses testes; eles usam o ambiente compartilhado
 *   de desenvolvimento, o mesmo que `npm run dev` usa por padrão.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  // 60s (em vez do padrão de 30s): em modo dev, o Next.js/Turbopack compila cada
  // rota sob demanda na primeira visita, o que pode ser lento em máquinas/VMs
  // com disco mais devagar.
  timeout: 60_000,
  expect: {
    timeout: 8_000,
  },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 45_000,
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev --prefix ../frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // O Next.js lê NEXT_PUBLIC_API_GATEWAY_URL no processo que roda `npm run dev`
    // (frontend/src/lib/api.ts) — diferente do E2E_API_URL usado pelas chamadas de
    // arrange feitas direto pelo Playwright. Repassamos o mesmo valor aqui pra que
    // o navegador de verdade converse com o mesmo backend que o teste está usando.
    env: process.env.E2E_API_URL
      ? { NEXT_PUBLIC_API_GATEWAY_URL: process.env.E2E_API_URL }
      : {},
  },
});
