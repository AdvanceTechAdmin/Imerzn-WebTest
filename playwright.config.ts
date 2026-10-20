import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

/*
 * Run order (one worker, so projects run one after another in the order listed below):
 *   1. setup        the setupTests below: create the localite, traveler, experience, and gallery
 *   2. chromium     every other test in tests/auth, localite, traveler (they use what setup created)
 *   3. booking-flow tests/flows/booking/: book, check both dashboards, cancel (in file order)
 * Within a project files run in path order. That order is right for setup (auth/localite-signup,
 * auth/traveler-signup, localite/create-experience, localite/create-gallery), and the booking-flow
 * files are numbered (01-, 02-, ...) because each step uses what the one before it created.
 *
 * The projects have no `dependencies` on purpose: a failed setup or flow step does not skip the
 * rest of the run (later tests fall back to the accounts saved by an earlier run), and running a
 * single file (npm test -- wishlist) does not re-run signup first.
 */

/** Tests that create the accounts and content the other tests use (paths relative to tests/). */
const setupTests = [
  'auth/localite-signup-and-verify.spec.ts',
  'auth/traveler-signup.spec.ts',
  'localite/create-experience.spec.ts',
  'localite/create-gallery.spec.ts',
];
export default defineConfig({
  testDir: './tests',

  // The tests share accounts and the testdata/*/created-*.json state files, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: env.isCI,
  retries: env.isCI ? 2 : 0,

  // Default limits; long tests raise their own with test.setTimeout.
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },

  // Terminal output and the HTML report (CI adds the JSON reporter on the command line).
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: env.baseURL,

    // CI is always headless; locally set HEADLESS=true in .env to hide the browser.
    headless: env.headless,

    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // Evidence for failed tests only.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      // 1. Create the accounts and content the other tests use.
      name: 'setup',
      testMatch: setupTests,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // 2. Independent tests (each one starts from the accounts and content created by setup).
      name: 'chromium',
      testIgnore: [...setupTests, 'flows/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // 3. The booking flow, in file order: each step uses the bookings made or changed before it.
      name: 'booking-flow',
      testDir: './tests/flows/booking',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
