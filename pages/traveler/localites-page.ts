import { expect, type Locator, type Page } from '@playwright/test';

/** Page Object for the Localites search page (/local-guides). */
export class LocalitesPage {
  constructor(private readonly page: Page) {}

  /** "Localites" link in the header navigation. */
  get localitesLink(): Locator {
    return this.page.getByRole('banner').getByRole('link', { name: 'Localites', exact: true });
  }

  get searchInput(): Locator {
    return this.page
      .getByRole('search', { name: 'Search localites' })
      .getByPlaceholder('Search by localite name, city, or country');
  }

  /** Result card link whose name heading matches exactly. */
  localiteResult(name: string): Locator {
    return this.page.getByRole('main').getByRole('link').filter({
      has: this.page.getByRole('heading', { level: 5, name, exact: true }),
    });
  }

  /** Open Localites from the header. */
  async open(): Promise<void> {
    await this.localitesLink.click();
    await expect(this.page).toHaveURL(/\/local-guides/);
    await expect(this.searchInput).toBeVisible();
  }

  /** Search by name. Enter is used because a place-suggestion list can cover the Search button. */
  async search(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await this.searchInput.press('Enter');
    await expect(this.page).toHaveURL(/[?&]q=/);
  }

  /** Verify the localite appears in the results and links to a localite profile. */
  async verifyLocaliteDisplayed(name: string): Promise<void> {
    const result = this.localiteResult(name);
    await expect(result).toBeVisible({ timeout: 30_000 });
    await expect(result).toHaveAttribute('href', /\/local-guides\//);
  }
}
