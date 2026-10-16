import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { StoriesPage } from '../../pages/traveler/stories-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getTravelerAccount } from '../../utils/traveler/created-traveler';
import { readStoryData } from '../../utils/traveler/story-data';

test('STR-001 | Traveler creates, edits, and publishes a story', async ({ page }) => {
  test.setTimeout(150_000);

  // Pre-setup: Traveler from AUTH-003 and story data from testdata/traveler/story.csv.
  const traveler = await getTravelerAccount();
  const story = await readStoryData();
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Story title', description: story.created.title },
    { type: 'Updated story title', description: story.updated.title },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const storiesPage = new StoriesPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Stories > My Stories, then create a story with an image.
  await step('Create a story', async () => {
    await storiesPage.openMyStories();
    await storiesPage.createStory(story.created, story.imagePath);
  });

  // Step 3: Verify the story is listed in My Stories.
  await step('Verify the story in My Stories', async () => {
    await storiesPage.verifyStoryCard(story.created);
  });

  // Step 4: Open the story, click the edit icon, change title and description, and update.
  await step('Edit the story', async () => {
    await storiesPage.editStory(story.created.title, story.updated);
  });

  // Step 5: Verify the update in My Stories (new values shown, old title gone).
  await step('Verify the updated story', async () => {
    await storiesPage.openMyStories();
    await storiesPage.verifyStoryCard(story.updated);
    await expect(storiesPage.storyCard(story.created.title)).toHaveCount(0);
  });

  // Step 6: Stories > Stories and verify the updated story is in the public list.
  await step('Verify the story in public Stories', async () => {
    await storiesPage.openPublicStories();
    await storiesPage.verifyStoryCard(story.updated);
  });
});
