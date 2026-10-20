import { readStoryData } from '@data/traveler/story-data';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('STR-001 | Traveler creates, edits, and publishes a story', { tag: ['@traveler'] }, async ({
  session, traveler, profileMenu, storiesPage,
}) => {
  test.setTimeout(150_000);

  // Pre-setup: story data from testdata/traveler/story.csv (unique titles per run).
  const story = await readStoryData();
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Story title', description: story.created.title },
    { type: 'Updated story title', description: story.updated.title },
  );

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await session.signIn(traveler);
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
