import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '@helpers/text';

/**
 * "Experiences I host" multi-select used on Create Your Profile and Edit Profile.
 * Selected values show as chips; options appear in a list under the "Select" box.
 */
export class ExperiencesMultiSelect {
  constructor(private readonly page: Page) {}

  /** Container holding the search box, chips, and option list. */
  get container(): Locator {
    return this.page.locator('.multiSelectContainer').filter({
      has: this.page.getByPlaceholder('Select'),
    });
  }

  get searchBox(): Locator {
    return this.container.getByPlaceholder('Select');
  }

  /** Selected-value chips. */
  get chips(): Locator {
    return this.container.locator('.chip');
  }

  /** Option in the open list, matched by its exact text. */
  option(name: string): Locator {
    return this.container
      .getByRole('listitem')
      .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`) });
  }

  /** Remove every selected chip. */
  async clear(): Promise<void> {
    while (await this.chips.count() > 0) {
      const remaining = await this.chips.count();
      await this.chips.first().locator('.closeIcon').click();
      await expect(this.chips).toHaveCount(remaining - 1);
    }
  }

  /** Tick each experience in the list, then close it. */
  async select(experiences: string[]): Promise<void> {
    for (const experience of experiences) {
      await this.searchBox.click();

      const option = this.option(experience);
      await option.click();
      await expect(option.getByRole('checkbox')).toBeChecked();
    }

    // Close the option list so it does not cover the fields below.
    await this.page.keyboard.press('Escape');
  }

  /** Replace the current selection with exactly these experiences. */
  async replaceWith(experiences: string[]): Promise<void> {
    await this.clear();
    await this.select(experiences);
    await expect(this.chips).toHaveCount(experiences.length);
  }
}
