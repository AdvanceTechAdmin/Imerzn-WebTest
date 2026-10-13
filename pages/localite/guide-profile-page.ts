
import { expect, type Locator, type Page } from '@playwright/test';

/** Page Object for links and experience entries on a guide's profile page. */
export class GuideProfilePage {
  constructor(private readonly page: Page) {}

  /** Navigation link shown after a guide signs in. */
  get dashboardLink(): Locator {
    return this.page.getByRole('link', { name: 'Dashboard' });
  }

  /** Opens the experience creation form from the guide profile. */
  get createExperienceLink(): Locator {
    return this.page.getByRole('link', {
      name: 'Create Experience',
      exact: true,
    });
  }

  /** Find the profile entry for an experience by its exact title. */
  experienceLink(title: string): Locator {
    return this.page.getByRole('link', { name: title, exact: true });
  }

  /** Expands the profile list when not all experiences are initially shown. */
  get showMoreExperiencesLink(): Locator {
    return this.page.getByRole('link', {
      name: 'Show more',
      exact: true,
    });
  }

  /** Return to the profile and verify that the published experience is displayed. */
  async verifyPublishedExperience(
    profileUrl: string,
    title: string,
  ): Promise<void> {
    // Return to the guide profile.
    await this.page.goto(profileUrl);

    // Find the experience by its unique title.
    let experience = this.experienceLink(title);

    // Expand the list if the experience is not initially displayed.
    if (await experience.count() === 0) {
      if (await this.showMoreExperiencesLink.isVisible().catch(() => false)) {
        await this.showMoreExperiencesLink.click();
        experience = this.experienceLink(title);
      }
    }

    // Verify that the experience is visible and links to its detail page.
    await expect(experience).toBeVisible({ timeout: 30_000 });
    await expect(experience).toHaveAttribute(
      'href',
      /find-tourist-guide\/details\/experience-/,
    );

    // Confirm that the experience title is displayed as a heading.
    await expect(
      experience.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }
}
