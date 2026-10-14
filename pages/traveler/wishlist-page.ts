import { expect, type Locator, type Page } from '@playwright/test';

/** Page Object for the traveler Wishlists page (/dashboard/wishlist). */
export class WishlistPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  get heading(): Locator {
    return this.main.getByRole('heading', { name: 'Wishlists', exact: true });
  }

  get nameInput(): Locator {
    return this.main.getByPlaceholder('New wishlist name, e.g. Japan 2027');
  }

  get createButton(): Locator {
    return this.main.getByRole('button', { name: 'Create', exact: true });
  }

  /** "Open <name>" button on a wishlist card. */
  openButton(name: string): Locator {
    return this.main.getByRole('button', { name: `Open ${name}`, exact: true });
  }

  /** Heading shown after opening a wishlist. */
  openedWishlistHeading(name: string): Locator {
    return this.main.getByRole('heading', { level: 2, name, exact: true });
  }

  /** Saved experience in an opened wishlist, matched by its details link. */
  savedExperience(href: string): Locator {
    return this.main.locator(`a[href="${href}"]`);
  }

  /** Create a wishlist and verify its card appears with no experiences. */
  async createWishlist(name: string): Promise<void> {
    await expect(this.heading).toBeVisible();
    await this.nameInput.fill(name);
    await this.createButton.click();

    await expect(this.openButton(name)).toBeVisible();
    await expect(this.main.getByText(name, { exact: true })).toBeVisible();
    await expect(this.nameInput).toHaveValue('');
  }

  async openWishlist(name: string): Promise<void> {
    await this.openButton(name).click();
    await expect(this.openedWishlistHeading(name)).toBeVisible();
  }

  /** Verify the opened wishlist contains the experience (link and title). */
  async verifySavedExperience(experience: { title: string; href: string }): Promise<void> {
    const saved = this.savedExperience(experience.href);
    await expect(saved).toBeVisible();
    await expect(saved.getByText(experience.title, { exact: true })).toBeVisible();
  }
}
