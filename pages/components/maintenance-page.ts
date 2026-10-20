import type { Locator, Page } from '@playwright/test';

/** Explanation used in errors and annotations when the site shows its maintenance page. */
export const SITE_OFFLINE_MESSAGE =
  'The site is showing its "Briefly offline" maintenance page (a deploy is in progress). ' +
  'This is not a test failure; re-run when the site is back.';

/**
 * The "Briefly offline - Imerzn is undergoing a quick update" page the site shows during a deploy.
 * Every page load fails while it is up, so tests report it instead of a generic timeout.
 */
export class MaintenancePage {
  constructor(private readonly page: Page) {}

  /** The maintenance message (it is the only text that stays the same; the photo changes). */
  get message(): Locator {
    return this.page.getByText('Imerzn is undergoing a quick update', { exact: false });
  }

  /** True if the maintenance page is on screen right now (no waiting). */
  async isShown(): Promise<boolean> {
    return this.message.isVisible().catch(() => false);
  }
}
