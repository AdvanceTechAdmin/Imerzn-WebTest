
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';
import {
  parseBoolean,
  splitList,
  type ExperienceData,
} from '../../utils/experience-data';

/**
 * Page Object for creating and publishing an experience.
 * Form values come from ExperienceData; UI-specific locators and interactions stay here.
 */
export class CreateExperiencePage {
  constructor(private readonly page: Page) {}

  /** Main heading used to confirm the experience form has opened. */
  get heading(): Locator {
    return this.page.getByRole('heading', {
      name: 'Experience',
      exact: true,
    });
  }

  /** Title field for the new experience. */
  get titleInput(): Locator {
    return this.page.getByPlaceholder('Give your post a title...');
  }

  /** Fill the experience form from CSV-backed data, including schedule and media. */
  async fillForm(data: ExperienceData): Promise<void> {
    if (data.experience_type.trim()) {
      const experienceType = data.experience_type.trim();

      if (!['Normal Experience', 'Hunt Experience'].includes(experienceType)) {
        throw new Error(
          'CSV field "Experience Type" must be "Normal Experience" or "Hunt Experience".',
        );
      }

      await this.page
        .getByRole('button', { name: experienceType, exact: true })
        .click();
    }

    await this.titleInput.fill(data.title.trim());

    const categories = splitList(data.categories);
    if (categories.length > 0) {
      await this.page.getByRole('textbox', { name: 'Select' }).click();

      for (const category of categories) {
        await this.page.getByText(category, { exact: true }).click();
      }
    }

    const location = data.location.trim();
    if (location) {
      const locationSelect = this.page.getByRole('combobox').first();
      const options = await locationSelect.locator('option').allTextContents();

      if (options.some((option) => option.trim() === location)) {
        await locationSelect.selectOption({ label: location });
      } else {
        await this.page.getByPlaceholder('Enter location...').fill(location);
      }
    }

    for (const [column, placeholder] of [
      ['price', 'Enter price'],
      ['min_people', 'Enter min no of people'],
      ['max_people', 'Enter max no of people'],
    ] as const) {
      if (data[column].trim()) {
        await this.page
          .getByPlaceholder(placeholder)
          .fill(data[column].trim());
      }
    }

    await this.fillRichTextEditor('know_before', data.know_before);

    for (const column of ['transport_type', 'accessibility'] as const) {
      if (data[column].trim()) {
        const checkbox = this.page
          .locator(`input[name="${column}"]`)
          .locator('xpath=..')
          .getByRole('checkbox');

        await this.setCheckbox(checkbox, data[column], column);
      }
    }

    const schedule = this.page
      .getByRole('heading', { name: 'Schedule & Time Slots' })
      .locator('xpath=..');

    await this.setCheckbox(
      this.page
        .getByText('Enable multi-day experience', { exact: true })
        .locator('xpath=..')
        .getByRole('checkbox'),
      data.multi_day,
      'Multi Day',
    );

    if (data.duration.trim()) {
      await this.page
        .locator('input[name="duration"]')
        .fill(data.duration.trim());
    }

    await this.setCheckbox(
      this.page.getByLabel('Apply same time to all days Mon – Sun'),
      data.sameTimeAllDays,
      'Same Time All Days',
    );

    for (const time of splitList(data.starting_times)) {
      await schedule.locator('svg.unique-inside-icon').click();
      await this.page.getByRole('option', { name: time, exact: true }).click();
    }

    for (const [column, placeholder] of [
      ['meeting_point', 'Enter meeting location'],
      ['drop_off_point', 'Enter drop location'],
    ] as const) {
      if (data[column].trim()) {
        await this.fillLocationAutocomplete(
          placeholder,
          data[column].trim(),
        );
      }
    }

    if (data.status.trim()) {
      const status = data.status.trim().toLowerCase();

      if (!['active', 'inactive'].includes(status)) {
        throw new Error(
          'CSV field "Status" must be "Active" or "Inactive".',
        );
      }

      const checkbox = this.page
        .locator('input[name="status"]')
        .locator('xpath=..')
        .getByRole('checkbox');

      await this.setCheckbox(
        checkbox,
        status === 'active' ? 'Yes' : 'No',
        'Status',
      );
    }

    if (data.meeting_drop_notes.trim()) {
      await this.page
        .getByPlaceholder('Enter here')
        .fill(data.meeting_drop_notes.trim());
    }

    await this.fillRichTextEditor('included', data.included);
    await this.fillRichTextEditor('description', data.description);

    if (data.policy.trim()) {
      await this.page
        .getByPlaceholder(
          'Enter cancellation policy specific to experience',
        )
        .fill(data.policy.trim());
    }

    await this.uploadPrimaryImage(data.primary_image_path);
    await this.uploadAdditionalMedia(data.additional_media_paths);
  }

  /** Submit Publish and return the matching backend response for business-level checks. */
  async publish(): Promise<Response> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).hostname === 'dev.api.imerzn.com' &&
        new URL(response.url()).pathname === '/guide/create-post' &&
        ['POST', 'PUT', 'PATCH'].includes(
          response.request().method(),
        ),
      { timeout: 45_000 },
    );

    await this.page
      .getByRole('button', { name: 'Publish', exact: true })
      .click();

    return responsePromise;
  }

  /** Publish the experience and verify that the API confirms successful creation. */
  async publishAndVerify(): Promise<void> {
    const response = await this.publish();

    const payload = await response.json().catch(() => null) as
      | { message?: string; status?: string; success?: boolean }
      | null;

    // Steps 1: Verify that the HTTP request succeeded.
    expect(
      response.ok(),
      `Publish request failed with HTTP ${response.status()}: ${response.url()}`,
    ).toBeTruthy();

    // Steps 2: Check whether the API explicitly reported a failure.
    if (
      payload?.success === false ||
      payload?.status?.toLowerCase() === 'error'
    ) {
      throw new Error(
        `Experience publish was rejected: ${
          payload.message ?? 'API reported an error.'
        }`,
      );
    }

    // Steps 3: Verify that the API confirms successful experience creation.
    expect(
      payload?.message,
      'Publish API response should confirm that the experience was created.',
    ).toMatch(/experience has been created successfully/i);
  }

  /** Fill a rich-text field only when the CSV supplies a non-empty value. */
  private async fillRichTextEditor(
    fieldName: string,
    value: string,
  ): Promise<void> {
    if (!value.trim()) {
      return;
    }

    const editor = this.page
      .locator(`input[type="hidden"][name="${fieldName}"]`)
      .locator('xpath=..')
      .getByRole('textbox', { name: /^Rich Text Editor/ });

    await editor.fill(value);
  }

  /** Choose an autocomplete suggestion and confirm the field accepted the selection. */
  private async fillLocationAutocomplete(
    placeholder: string,
    value: string,
  ): Promise<void> {
    const input = this.page.getByPlaceholder(placeholder);
    await input.fill(value);

    const suggestion = this.page.getByText(value, { exact: true });
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    await expect(input).toHaveValue(value);
  }

  /** Apply CSV Yes/No or True/False values, preserving the app default for blanks. */
  private async setCheckbox(
    checkbox: Locator,
    value: string,
    fieldName: string,
  ): Promise<void> {
    const checked = parseBoolean(value, fieldName);

    if (checked === undefined) {
      return;
    }

    if (checked) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  /** Upload the required primary image and wait for its preview to appear. */
  private async uploadPrimaryImage(path: string): Promise<void> {
    if (!path.trim()) {
      throw new Error(
        'Provide Primary Image in testdata/create-experience.csv.',
      );
    }

    const filePath = resolve(process.cwd(), path);

    if (!existsSync(filePath)) {
      throw new Error(`Primary image file does not exist: ${filePath}`);
    }

    await this.page
      .locator('#galleryImageUpload')
      .setInputFiles(filePath);

    await expect(
      this.page.getByRole('img', { name: 'Media', exact: true }),
    ).toBeVisible();
  }

  /** Upload optional additional media files when paths are provided in the CSV. */
  private async uploadAdditionalMedia(paths: string): Promise<void> {
    const filePaths = splitList(paths).map((path) =>
      resolve(process.cwd(), path),
    );

    for (const filePath of filePaths) {
      if (!existsSync(filePath)) {
        throw new Error(
          `Additional media file does not exist: ${filePath}`,
        );
      }
    }

    if (filePaths.length > 0) {
      await this.page
        .locator('#smallMedia')
        .setInputFiles(filePaths);
    }
  }
}
