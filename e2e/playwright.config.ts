import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
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
    cwd: '../frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI || process.env.E2E_REUSE_SERVER === 'true',
    timeout: 120_000,
    env: process.env.E2E_API_URL
      ? { NEXT_PUBLIC_API_GATEWAY_URL: process.env.E2E_API_URL }
      : {},
  },
});
