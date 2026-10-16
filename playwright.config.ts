import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

// Tests that must run in this order: each step uses the bookings made or changed by the ones before.
const bookingFlow = [
  { name: 'booking', file: 'traveler/experience-booking' },
  { name: 'traveler-dashboard', file: 'traveler/traveler-dashboard-after-bookings' },
  { name: 'localite-dashboard', file: 'localite/localite-dashboard-after-bookings' },
  { name: 'traveler-cancel', file: 'traveler/cancel-booking' },
  { name: 'localite-cancel', file: 'localite/localite-cancel-booking' },
];

/** Matches exactly tests/<file>.spec.ts (Windows or POSIX path separators). */
function specFile(file: string): RegExp {
  return new RegExp(`[\\/]tests[\\/]${file.replace('/', '[\\/]')}\\.spec\\.ts$`);
}

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
      // Every test that is not part of the booking flow below.
      name: 'chromium',
      testIgnore: bookingFlow.map(({ file }) => specFile(file)),
      use: { ...devices['Desktop Chrome'] },
    },
    // The booking flow, one project per step. With --workers=1, projects run in the order listed,
    // after all 'chromium' tests. They have no 'dependencies', so a failed step does not skip the
    // later ones, and running a single file (e.g. npm run test:wishlist) does not pull them in.
    ...bookingFlow.map(({ name, file }) => ({
      name,
      testMatch: specFile(file),
      use: { ...devices['Desktop Chrome'] },
    })),
  ],
});