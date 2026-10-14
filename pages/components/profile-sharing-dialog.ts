import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '../../utils/common';

/** "Profile Sharing" dialog opened by Share Profile on the profile and preview pages. */
export class ProfileSharingDialog {
  constructor(private readonly page: Page) {}

  get dialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Profile Sharing' }),
    });
  }

  /** Close (X) button in the dialog header. */
  get closeButton(): Locator {
    return this.dialog.locator('button.btn-close');
  }

  /** Localite name heading, e.g. "First Last (Business Name)". */
  nameHeading(firstName: string, lastName: string): Locator {
    return this.dialog.getByRole('heading', {
      level: 5,
      name: new RegExp(`^${escapeRegExp(`${firstName} ${lastName}`)}`),
    });
  }

  bioText(bio: string): Locator {
    return this.dialog.getByText(bio, { exact: true });
  }

  /** Verify the dialog is open and shows the localite's name and bio. */
  async verifyDetails(firstName: string, lastName: string, bio: string): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.nameHeading(firstName, lastName)).toBeVisible();
    await expect(this.dialog.getByRole('heading', { name: 'Bio', exact: true })).toBeVisible();
    await expect(this.bioText(bio)).toBeVisible();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
