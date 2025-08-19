import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/playwright',
  timeout: 30 * 1000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port=5173',
    port: 5173,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
