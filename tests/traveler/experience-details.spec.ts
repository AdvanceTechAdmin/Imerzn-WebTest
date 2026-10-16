import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { FindTouristGuidePage } from '../../pages/localite/find-tourist-guide-page';
import { ExperienceDetailsPage } from '../../pages/traveler/experience-details-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import {
  getLocaliteAccount,
  readCreatedContent,
} from '../../utils/localite/created-localite';
import { getTravelerAccount } from '../../utils/traveler/created-traveler';
import { readExperienceData } from '../../utils/localite/experience-data';

test('EXP-001 | Traveler opens the created experience: wishlist, share, like, and message', async ({ page }) => {
  test.setTimeout(150_000);

  // Pre-setup: traveler from AUTH-003; experience, localite name, and description from the localite tests.
  const traveler = await getTravelerAccount();
  const localite = await getLocaliteAccount();
  const localiteName = `${localite.firstName} ${localite.lastName}`;
  const { experienceTitle } = await readCreatedContent(localite.email);
  if (!experienceTitle) {
    throw new Error(
      `No created experience recorded for ${localite.email}. ` +
      'Run Create Experience first (testdata/localite/created-content.json).',
    );
  }
  const { description } = await readExperienceData();
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Experience', description: experienceTitle },
    { type: 'Localite', description: localiteName },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const experiencesPage = new FindTouristGuidePage(page);
  const detailsPage = new ExperienceDetailsPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Experiences > search the experience name > open it.
  await step('Search and open the experience', async () => {
    await experiencesPage.openExperiences();
    await experiencesPage.searchExperience(experienceTitle);
    await experiencesPage.openExperience(experienceTitle);
    await detailsPage.expectOpened(experienceTitle);
  });

  // Step 3: Save to Wishlist shows "Create your first wishlist"; close it.
  await step('Verify the Create your first wishlist dialog', async () => {
    await detailsPage.verifyCreateFirstWishlistDialog();
  });

  // Step 4: Share shows Experience Sharing with the localite name and description; close it.
  await step('Verify the Experience Sharing dialog', async () => {
    await detailsPage.verifyExperienceSharingDialog(localiteName, description.trim());
  });

  // Step 5: Like shows the count next to the icon.
  await step('Like the experience', async () => {
    const count = await detailsPage.likeAndVerifyCount();
    test.info().annotations.push({ type: 'Like count', description: String(count) });
  });

  // Step 6: Message / Plan My Trip opens Write message.
  await step('Verify Write message opens', async () => {
    await detailsPage.verifyWriteMessageOpens();
  });
});
