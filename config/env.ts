import 'dotenv/config';

/**
 * Settings that come from the environment (.env locally, the workflow's env: block in CI).
 * Read them from here instead of process.env, so every name and default lives in one place.
 */
export const env = {
  /** True on GitHub Actions (and any CI that sets CI=true). */
  isCI: Boolean(process.env.CI),

  /** Site under test. */
  baseURL: process.env.BASE_URL ?? 'https://dev.imerzn.com',

  /** Admin portal (used by the localite signup test to verify the new localite). */
  adminBaseURL: process.env.ADMIN_BASE_URL ?? 'https://dev.admin.imerzn.com',

  /** Signup tests create real accounts, so they only run when RUN_SIGNUP_TEST=true. */
  runSignup: process.env.RUN_SIGNUP_TEST === 'true',

  /** Local runs only: set HEADLESS=true to hide the browser. CI is always headless. */
  headless: Boolean(process.env.CI) || process.env.HEADLESS === 'true',
};
