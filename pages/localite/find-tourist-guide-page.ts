import { expect, type Locator, type Page } from '@playwright/test';
import { SaveToWishlistDialog } from '../components/save-to-wishlist-dialog';

/** An experience card picked on the Experiences page. */
export interface ExperienceCard {
  title: string;
  href: string;
  card: Locator;
}

/** Page Object for searching experiences. */
export class FindTouristGuidePage {
  /** Dialog opened by the heart icon on an experience card. */
  readonly saveToWishlistDialog: SaveToWishlistDialog;

  constructor(private readonly page: Page) {
    this.saveToWishlistDialog = new SaveToWishlistDialog(page);
  }

  /** Experience cards that have a heart (Save to Wishlist) button. */
  get experienceCards(): Locator {
    return this.page.locator('.experience-list-cards').filter({
      has: this.page.getByRole('button', { name: 'Save to Wishlist' }),
    });
  }

  /**
   * Return the first visible experience card, or undefined if none load within the timeout.
   * The list reloads and re-sorts after it first appears, leaving earlier cards hidden, so
   * wait for loading to settle, use only visible cards, and pin the card by its details link.
   */
  async firstExperienceCard(timeout = 15_000): Promise<ExperienceCard | undefined> {
    const first = this.experienceCards.filter({ visible: true }).first();
    const loaded = await first.waitFor({ timeout }).then(() => true, () => false);
    if (!loaded) {
      return undefined;
    }
    // Best effort: let the list finish reloading (third-party requests can keep the network busy).
    await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    await first.waitFor({ timeout });

    // The image link's alt text is the clean title; the title link also holds badges like "✨ New".
    const imageLink = first.locator('a[href*="/details/"]').first();
    const href = await imageLink.getAttribute('href');
    const title = (await imageLink.getByRole('img').getAttribute('alt'))?.trim();
    if (!href || !title) {
      throw new Error('Experience card is missing its details link or image title.');
    }

    const card = this.page.locator('.experience-list-cards').filter({
      has: this.page.locator(`a[href="${href}"]`),
      visible: true,
    }).first();
    return { title, href, card };
  }

  /** Open an experience from the results by its exact title (the card image's alt text). */
  async openExperience(title: string): Promise<void> {
    const card = this.page.locator('.experience-list-cards').filter({
      has: this.page.locator(`img[alt="${title}"]`),
      visible: true,
    }).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.locator('a[href*="/details/"]').first().click();
  }

  /** Click the heart on a card and wait for the Save to wishlist dialog. */
  async openSaveToWishlist(experience: ExperienceCard): Promise<void> {
    await experience.card.getByRole('button', { name: 'Save to Wishlist' }).click();
    await expect(this.saveToWishlistDialog.dialog).toBeVisible();
  }

/** Navigation link to the Experiences search page in the header. */
get experiencesLink(): Locator {
  return this.page
    .getByRole('banner')
    .getByRole('link', {
      name: 'Experiences',
      exact: true,
    });
}

  /** Search field for a city, country, or place. */
  get searchInput(): Locator {
    return this.page.getByPlaceholder(
      'Search by city, country or place',
    );
  }

  /** Search button. */
  get searchButton(): Locator {
    return this.page.getByRole('button', {
      name: 'Search',
      exact: true,
    });
  }

  /** Open the Experiences page from the navigation menu. */
  async openExperiences(): Promise<void> {
    // Right after login the page may still be loading and a click can be lost: retry until it opens.
    await expect(async () => {
      await this.experiencesLink.click({ timeout: 5_000 });
      await expect(this.page).toHaveURL(/\/find-tourist-guide/, { timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
  }

  /** Search using the created experience title. */
  async searchExperience(title: string): Promise<void> {
    await this.searchInput.fill(title);
    await this.searchButton.click();
  }

  /** Verify that the experience appears in the search results. */
  async verifyExperienceDisplayed(title: string): Promise<void> {
    await expect(
      this.page.getByText(title, { exact: true }).first(),
    ).toBeVisible({ timeout: 30_000 });
  }
}