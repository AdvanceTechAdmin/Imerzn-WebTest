import { expect, type Locator, type Page } from '@playwright/test';
import { ExperiencesMultiSelect } from '../components/experiences-multi-select';

/** Data required to complete the localite "Create Your Profile" form. */
export interface GuideProfileFormData {
  profilePicturePath: string;
  bio: string;
  experiences: string[];
  zipcode: string;
}

/**
 * Page Object for the "Create Your Profile" page shown to a new localite
 * right after phone verification (/create_guide_profiles).
 */
export class CreateGuideProfilePage {
  /** "Experiences I host" multi-select. */
  readonly experiences: ExperiencesMultiSelect;

  constructor(private readonly page: Page) {
    this.experiences = new ExperiencesMultiSelect(page);
  }

  /** Main heading used to confirm the profile form has opened. */
  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Create Your Profile' });
  }

  /** Profile-picture upload input. */
  get profilePictureInput(): Locator {
    return this.page.locator('#profile-pic');
  }

  /** Crop Profile Picture dialog displayed after choosing an image. */
  get cropDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Crop Profile Picture' });
  }

  get bioInput(): Locator {
    return this.page.getByPlaceholder('Enter your bio');
  }

  get zipcodeInput(): Locator {
    return this.page.getByRole('spinbutton', { name: 'Enter your zipcode' });
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Submit', exact: true });
  }

  /** Fill the profile form: photo, bio, hosted experiences, and zipcode. */
  async fillForm(data: GuideProfileFormData): Promise<void> {
    await expect(this.heading).toBeVisible();

    await this.uploadProfilePicture(data.profilePicturePath);

    await this.bioInput.fill(data.bio);
    await this.experiences.select(data.experiences);

    await this.zipcodeInput.fill(data.zipcode);
    await expect(this.zipcodeInput).toHaveValue(data.zipcode);
  }

  /** Upload a profile picture and save it in the Crop Profile Picture dialog. */
  async uploadProfilePicture(imagePath: string): Promise<void> {
    await this.profilePictureInput.setInputFiles(imagePath);

    await this.cropDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(this.cropDialog).toBeHidden();
  }

  /** Submit the completed profile. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
