import { expect, type Locator, type Page } from '@playwright/test';
import type { LocaliteSettingsData } from '../../utils/localite/localite-settings-data';
import type { TravelerSettingsData } from '../../utils/traveler/traveler-settings-data';

/**
 * Page Object for Settings (/dashboard/settings), shared by travelers and localites:
 * Account Details (edit/save) and Change Password. Localites also have a Bio field.
 */
export class SettingsPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  get accountDetailsHeading(): Locator {
    return this.main.getByRole('heading', { name: 'Account Details' });
  }

  /** "Edit" control that switches Account Details into edit mode. */
  get editButton(): Locator {
    return this.main.getByText('Edit', { exact: true });
  }

  get saveChangesButton(): Locator {
    return this.main.getByRole('button', { name: 'Save Changes', exact: true });
  }

  get firstNameInput(): Locator {
    return this.main.getByRole('textbox', { name: 'Enter name' });
  }

  get lastNameInput(): Locator {
    return this.main.getByRole('textbox', { name: 'Last name' });
  }

  get phoneInput(): Locator {
    return this.main.getByPlaceholder('Enter contact number');
  }

  /** Business name (localites only). */
  get businessNameInput(): Locator {
    return this.main.getByRole('textbox', { name: 'Business name' });
  }

  /** Bio textarea (localites only). */
  get bioInput(): Locator {
    return this.main.locator('textarea[name="bio"]');
  }

  /** Name heading on the profile card, e.g. "First Last". */
  nameHeading(firstName: string, lastName: string): Locator {
    return this.main.getByRole('heading', { level: 4, name: `${firstName} ${lastName}`, exact: true });
  }

  get changePasswordButton(): Locator {
    return this.main.getByRole('button', { name: 'Change Password', exact: true });
  }

  get changePasswordDialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Change Password' }),
    });
  }

  async open(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard\/settings/);
    await expect(this.accountDetailsHeading).toBeVisible();
    // Wait for saved values to load before editing.
    await expect(this.firstNameInput).not.toHaveValue('');
    // State and City lists load a few seconds later. Saving before that sends them empty and the
    // site rejects the save ("Please enter a valid state" / "city cannot be null"), so wait for
    // both to be filled in by the page. The test only waits; it never changes State or City.
    await expect(this.main.locator('select[name="state"]')).not.toHaveValue('', { timeout: 30_000 });
    await expect(this.main.locator('select[name="city"]')).not.toHaveValue('', { timeout: 30_000 });
  }

  /** Switch Account Details into edit mode. */
  async startEditing(): Promise<void> {
    await this.editButton.click();
    await expect(this.saveChangesButton).toBeVisible();
  }

  /** Replace the phone number (10 US digits). */
  async fillPhone(phone: string): Promise<void> {
    // The phone widget ignores fill('') and select-all; delete from the end key by key, then type.
    await this.phoneInput.click();
    await this.phoneInput.press('End');
    for (let i = 0; i < 20; i += 1) {
      await this.phoneInput.press('Backspace');
    }
    await this.phoneInput.pressSequentially(phone, { delay: 50 });
    await expect(this.phoneInput).toHaveValue(formatUsPhone(phone));
  }

  /**
   * Localite: enter edit mode and change phone and Bio. Business name is also set because the
   * site refuses to save without one ("business_name cannot be null").
   * State and City are left unchanged.
   */
  async editPhoneAndBio(data: LocaliteSettingsData): Promise<void> {
    await this.startEditing();
    await this.fillPhone(data.phone);
    await this.businessNameInput.fill(data.businessName);
    await this.bioInput.fill(data.bio);
    await expect(this.bioInput).toHaveValue(data.bio);
  }

  /** Localite: verify the saved phone and Bio are displayed. */
  async verifyPhoneAndBio(phone: string, bio: string): Promise<void> {
    await expect(this.phoneInput).toHaveValue(formatUsPhone(phone));
    await expect(this.bioInput).toHaveValue(bio);
  }

  /** Traveler: enter edit mode and update name and phone (State and City are left unchanged). */
  async editAccountDetails(data: TravelerSettingsData): Promise<void> {
    await this.startEditing();

    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.fillPhone(data.phone);
  }

  /** Save and wait for the form to leave edit mode. */
  async saveChanges(): Promise<void> {
    await this.saveChangesButton.click();
    await expect(
      this.page.getByText('Your profile has been updated successfully'),
      'Save Changes was not confirmed; check the page for a validation message.',
    ).toBeVisible({ timeout: 30_000 });
    await expect(this.saveChangesButton).toBeHidden();
    await expect(this.editButton).toBeVisible();
  }

  /** Verify the saved values are displayed (fields are read-only after saving). */
  async verifyAccountDetails(data: TravelerSettingsData): Promise<void> {
    await expect(this.nameHeading(data.firstName, data.lastName)).toBeVisible();
    await expect(this.firstNameInput).toHaveValue(data.firstName);
    await expect(this.lastNameInput).toHaveValue(data.lastName);
    await expect(this.phoneInput).toHaveValue(formatUsPhone(data.phone));
  }

  /** Open Change Password, fill current/new/confirm, and submit. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.changePasswordButton.click();
    await expect(this.changePasswordDialog).toBeVisible();

    // The dialog can clear its fields just after opening, so fill them, then confirm all three
    // still hold the values (refilling if they were cleared) before clicking Update Password.
    const fields = [
      [this.changePasswordDialog.locator('input[name="oldpassword"]'), currentPassword],
      [this.changePasswordDialog.locator('input[name="password"]'), newPassword],
      [this.changePasswordDialog.locator('input[name="cpassword"]'), newPassword],
    ] as const;
    await expect(async () => {
      for (const [input, value] of fields) {
        if ((await input.inputValue()) !== value) {
          await input.fill(value);
        }
      }
      // Give a late reset a moment to happen before confirming the values stuck.
      await this.page.waitForTimeout(500);
      for (const [input, value] of fields) {
        await expect(input).toHaveValue(value, { timeout: 1_000 });
      }
    }).toPass({ timeout: 15_000 });

    await this.changePasswordDialog.getByRole('button', { name: 'Update Password', exact: true }).click();

    await expect(this.page.getByText('Your password has been updated successfully')).toBeVisible({ timeout: 30_000 });
    await expect(this.changePasswordDialog).toBeHidden();
  }
}

/** Format 10 US digits the way the phone widget shows them, e.g. "+1 (201) 555-0123". */
function formatUsPhone(digits: string): string {
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
