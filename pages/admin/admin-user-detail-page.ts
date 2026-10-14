import { expect, type Locator, type Page } from '@playwright/test';

/** Page Object for the admin user detail view opened from Users > View. */
export class AdminUserDetailPage {
  constructor(private readonly page: Page) {}

  /**
   * "Verified" toggle switch. The checkbox has no label, so find the smallest row that
   * contains both the "Verified" text and a checkbox (.last() = innermost match).
   */
  get verifiedToggle(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText('Verified', { exact: true }) })
      .filter({ has: this.page.getByRole('checkbox') })
      .last()
      .getByRole('checkbox');
  }

  get saveChangesButton(): Locator {
    return this.page.getByRole('button', { name: 'Save changes' });
  }

  /** Switch Verified on (toggle to the right) if it is off, then save. */
  async markVerifiedAndSave(): Promise<void> {
    await expect(this.verifiedToggle).toBeVisible();
    if (!(await this.verifiedToggle.isChecked())) {
      await this.verifiedToggle.click();
    }
    await expect(this.verifiedToggle).toBeChecked();

    await this.saveChangesButton.click();
  }
}
