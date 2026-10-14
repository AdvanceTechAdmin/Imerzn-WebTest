import { expect, type Locator, type Page } from '@playwright/test';
import type { EditProfileData } from '../../utils/edit-profile-data';
import { ExperiencesMultiSelect } from '../components/experiences-multi-select';

/** Page Object for a localite's Edit Profile page (/edit-profile/<slug>). */
export class EditProfilePage {
  /** "Experiences I host" multi-select. */
  readonly experiences: ExperiencesMultiSelect;

  constructor(private readonly page: Page) {
    this.experiences = new ExperiencesMultiSelect(page);
  }

  get firstNameInput(): Locator {
    return this.page.getByRole('textbox', { name: 'First Name', exact: true });
  }

  get lastNameInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Last Name', exact: true });
  }

  get bioInput(): Locator {
    return this.page.getByPlaceholder('Enter bio');
  }

  get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save', exact: true });
  }

  /** Replace first name, last name, bio, and hosted experiences with new values. */
  async fillForm(data: EditProfileData): Promise<void> {
    await expect(this.page).toHaveURL(/\/edit-profile\//);
    // Wait for the saved profile to load before overwriting it.
    await expect(this.firstNameInput).not.toHaveValue('');

    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.bioInput.fill(data.bio);
    await this.experiences.replaceWith(data.experiences);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
