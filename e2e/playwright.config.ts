import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Sem retentativa automática, no CI e localmente: uma falha deve permanecer visível até ser
  // classificada (docs/tas.md, seção 3). Reexecutar para investigar instabilidade é deliberado e
  // registrado na issue, nunca automático.
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: process.env.E2E_JUNIT_FILE ?? 'test-results/results.xml' }],
  ],
  timeout: 60_000,
  expect: {
    timeout: 8_000,
  },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // Com retries: 0 o trace 'on-first-retry' nunca seria gravado; a evidência da falha vem do trace
    // da própria execução que falhou.
    trace: 'retain-on-failure',
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
    cwd: '../frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI || process.env.E2E_REUSE_SERVER === 'true',
    timeout: 120_000,
    env: process.env.E2E_API_URL
      ? { NEXT_PUBLIC_API_GATEWAY_URL: process.env.E2E_API_URL }
      : {},
  },
});
