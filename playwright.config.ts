import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/ 2>/dev/null || true; HOSTNAME=127.0.0.1 PORT=3001 node .next/standalone/server.js',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },

  projects: [
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
        launchOptions: {
          executablePath: '/usr/bin/google-chrome',
        },
      },
    },
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          executablePath: '/usr/bin/google-chrome',
        },
      },
    },
  ],
});
