import { expect, type Locator, type Page } from '@playwright/test';
import { selectLocationSuggestion } from '../components/location-picker';
import type { StoryFormData } from '@data/traveler/story-data';

/**
 * Page Object for traveler stories: the header Stories menu, My Stories (/my-stories),
 * the public Stories list (/traveller-stories), a story (/view-story/<id>),
 * and the create/edit story form (/share-experience, /edit-story/<id>).
 */
export class StoriesPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  /** "Stories" item in the header; hovering it shows My Stories and Stories. */
  get headerStoriesMenu(): Locator {
    return this.page.getByRole('banner').getByRole('link', { name: 'Stories', exact: true }).first();
  }

  get myStoriesMenuLink(): Locator {
    return this.page.getByRole('banner').getByRole('link', { name: 'My Stories', exact: true });
  }

  /** "Stories" entry inside the header Stories menu (the public list). */
  get storiesMenuLink(): Locator {
    return this.page.getByRole('banner').getByRole('list').getByRole('link', { name: 'Stories', exact: true }).last();
  }

  /** "Create Story", or "Create Your First Story" when the traveler has none yet. */
  get createStoryLink(): Locator {
    return this.main.getByRole('link', { name: /^Create (Your First )?Story$/ });
  }

  /**
   * Story card whose title heading matches exactly. Works on My Stories (card inside a link)
   * and the public Stories list (card without a link).
   */
  storyCard(title: string): Locator {
    return this.main.locator('.card-body').filter({
      has: this.page.getByRole('heading', { level: 5, name: title, exact: true }),
    });
  }

  /** Edit (pencil) icon on a story page; it has no text, so match its link. */
  get editStoryLink(): Locator {
    return this.main.locator('a[href^="/edit-story/"]');
  }

  get titleInput(): Locator {
    return this.main.getByRole('textbox', { name: 'Title of Your Story' });
  }

  get locationInput(): Locator {
    return this.main.getByPlaceholder('Enter your location');
  }

  get descriptionInput(): Locator {
    return this.main.getByRole('textbox', { name: 'Tell Us About Your Experience' });
  }

  get mediaInput(): Locator {
    return this.main.locator('#media');
  }

  get submitButton(): Locator {
    return this.main.getByRole('button', { name: 'Submit Experience', exact: true });
  }

  get updateButton(): Locator {
    return this.main.getByRole('button', { name: 'Update Story', exact: true });
  }

  /** Open Stories > My Stories from the header. */
  async openMyStories(): Promise<void> {
    await this.headerStoriesMenu.hover();
    await this.myStoriesMenuLink.click();
    await expect(this.page).toHaveURL(/\/my-stories/);
  }

  /** Open Stories > Stories (public list) from the header. */
  async openPublicStories(): Promise<void> {
    await this.headerStoriesMenu.hover();
    await this.storiesMenuLink.click();
    await expect(this.page).toHaveURL(/\/traveller-stories/);
    await expect(this.main.getByRole('heading', { name: 'Traveler Stories' })).toBeVisible();
  }

  /** Create a story with an image and wait for My Stories. */
  async createStory(story: StoryFormData, imagePath: string): Promise<void> {
    await this.createStoryLink.click();
    await expect(this.main.getByRole('heading', { name: 'Share Your Travel Experience' })).toBeVisible();

    await this.titleInput.fill(story.title);
    await selectLocationSuggestion(this.page, this.locationInput, story.location);
    await this.descriptionInput.fill(story.description);
    await this.mediaInput.setInputFiles(imagePath);
    await expect(this.main.getByRole('img', { name: 'preview-0' })).toBeVisible();

    // Check the save request itself, so a server error is reported clearly
    // (the page shows no message and just stays on the form).
    const saveResponse = this.page.waitForResponse(
      (response) => /\/traveller\/save-Ai-experience/i.test(response.url()) && response.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await this.submitButton.click();
    const response = await saveResponse;
    expect(response.ok(), `Save story request failed: HTTP ${response.status()} ${await response.text().catch(() => '')}`.slice(0, 500)).toBe(true);
    await expect(this.page).toHaveURL(/\/my-stories/, { timeout: 30_000 });
  }

  /** Verify a story card shows the title, location, description, and image. */
  async verifyStoryCard(story: StoryFormData): Promise<void> {
    const card = this.storyCard(story.title);
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card.getByRole('heading', { level: 6, name: story.location, exact: true })).toBeVisible();
    await expect(card.getByText(story.description, { exact: true })).toBeVisible();
    await expect(card.getByRole('img', { name: 'Story Media' })).toBeVisible();
  }

  /** Open a story, click the edit icon, change title and description, and update. */
  async editStory(currentTitle: string, updated: StoryFormData): Promise<void> {
    await this.storyCard(currentTitle).click();
    await expect(this.page).toHaveURL(/\/view-story\//);

    await this.editStoryLink.click();
    await expect(this.main.getByRole('heading', { name: 'Edit Your Travel Story' })).toBeVisible();
    // Wait for the saved story to load before overwriting it.
    await expect(this.titleInput).toHaveValue(currentTitle);

    await this.titleInput.fill(updated.title);
    await this.descriptionInput.fill(updated.description);
    await this.updateButton.click();
    await expect(this.page).not.toHaveURL(/\/edit-story\//, { timeout: 30_000 });
  }
}
