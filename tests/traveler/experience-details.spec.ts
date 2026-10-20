import { readExperienceData } from '@data/localite/experience-data';
import { readCreatedContent } from '@data/state/created-localite';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('EXP-001 | Traveler opens the created experience: wishlist, share, like, and message', { tag: ['@traveler'] }, async ({
  session, traveler, localite, profileMenu, experiencesPage, experienceDetailsPage,
}) => {
  test.setTimeout(150_000);

  // Pre-setup: the experience created by create-experience.spec.ts, its localite's name, and its description.
  const localiteName = `${localite.firstName} ${localite.lastName}`;
  const { experienceTitle } = await readCreatedContent(localite.email);
  if (!experienceTitle) {
    throw new Error(
      `No created experience recorded for ${localite.email}. ` +
      'Run the setup tests first (npm run test:setup).',
    );
  }
  const { description } = await readExperienceData();
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Experience', description: experienceTitle },
    { type: 'Localite', description: localiteName },
  );

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await session.signIn(traveler);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Experiences > search the experience name > open it.
  await step('Search and open the experience', async () => {
    await experiencesPage.openExperiences();
    await experiencesPage.searchExperience(experienceTitle);
    await experiencesPage.openExperience(experienceTitle);
    await experienceDetailsPage.expectOpened(experienceTitle);
  });

  // Step 3: Save to Wishlist shows "Create your first wishlist"; close it.
  await step('Verify the Create your first wishlist dialog', async () => {
    await experienceDetailsPage.verifyCreateFirstWishlistDialog();
  });

  // Step 4: Share shows Experience Sharing with the localite name and description; close it.
  await step('Verify the Experience Sharing dialog', async () => {
    await experienceDetailsPage.verifyExperienceSharingDialog(localiteName, description.trim());
  });

  // Step 5: Like shows the count next to the icon.
  await step('Like the experience', async () => {
    const count = await experienceDetailsPage.likeAndVerifyCount();
    test.info().annotations.push({ type: 'Like count', description: String(count) });
  });

  // Step 6: Message / Plan My Trip opens Write message.
  await step('Verify Write message opens', async () => {
    await experienceDetailsPage.verifyWriteMessageOpens();
  });
});
