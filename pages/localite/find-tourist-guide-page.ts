import { expect, type Locator, type Page } from '@playwright/test';

/** Page Object for searching experiences. */
export class FindTouristGuidePage {
  constructor(private readonly page: Page) {}

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
    await this.experiencesLink.click();
    await expect(this.page).toHaveURL(/\/find-tourist-guide/);
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