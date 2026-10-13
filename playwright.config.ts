import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

// Local setting: true = hide browser, false = show browser
const localHeadless = false;

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,

  timeout: 45_000,

  expect: {
    timeout: 10_000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  outputDir: 'test-results',

  use: {
    baseURL: process.env.BASE_URL ?? 'https://dev.imerzn.com',

    // GitHub Actions always runs headless.
    // Local runs use localHeadless.
    headless: isCI ? true : localHeadless,

    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});