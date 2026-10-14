import { expect, type Locator, type Page } from '@playwright/test';
import { selectLocationSuggestion } from '../../utils/common';
import type { GalleryData } from '../../utils/gallery-data';

/** Page Object for the Create Gallery form (/create-gallery). */
export class CreateGalleryPage {
  constructor(private readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Gallery', exact: true });
  }

  get titleInput(): Locator {
    return this.page.getByPlaceholder('Give your post a title...');
  }

  get locationInput(): Locator {
    return this.page.getByPlaceholder('Enter your location');
  }

  get descriptionInput(): Locator {
    return this.page.getByPlaceholder('Enter description about your experience');
  }

  get primaryImageInput(): Locator {
    return this.page.locator('#galleryImageUpload');
  }

  get additionalMediaInput(): Locator {
    return this.page.locator('#smallMedia');
  }

  get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save', exact: true });
  }

  /** Fill the gallery form: title, location suggestion, description, and media. */
  async fillForm(data: GalleryData): Promise<void> {
    await expect(this.page).toHaveURL(/\/create-gallery/);
    await expect(this.heading).toBeVisible();

    await this.titleInput.fill(data.title);
    if (data.location) {
      await selectLocationSuggestion(this.page, this.locationInput, data.location);
    }
    await this.descriptionInput.fill(data.description);

    await this.primaryImageInput.setInputFiles(data.primaryImagePath);
    if (data.additionalMediaPaths.length > 0) {
      await this.additionalMediaInput.setInputFiles(data.additionalMediaPaths);
    }
  }

  /** Save the gallery and wait until the app leaves the form. */
  async save(): Promise<void> {
    await this.saveButton.click();
    await expect(this.page).not.toHaveURL(/\/create-gallery/, { timeout: 30_000 });
  }
}
