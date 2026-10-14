import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { FindTouristGuidePage } from '../../pages/localite/find-tourist-guide-page';
import { LocalitesPage } from '../../pages/traveler/localites-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common';
import {
  getLocaliteAccount,
  getTravelerAccount,
  readCreatedContent,
} from '../../utils/created-localite';

test('SRCH-001 | Traveler finds the created experience and localite by search', async ({ page }) => {
  test.setTimeout(120_000);

  // Pre-setup: Traveler from AUTH-003; localite name and experience created by the localite tests.
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
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Experience', description: experienceTitle },
    { type: 'Localite', description: localiteName },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const experiencesPage = new FindTouristGuidePage(page);
  const localitesPage = new LocalitesPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Search Experiences for the created experience.
  await step('Search for the experience', async () => {
    await experiencesPage.openExperiences();
    await experiencesPage.searchExperience(experienceTitle);
    await experiencesPage.verifyExperienceDisplayed(experienceTitle);
  });

  // Step 3: Search Localites for the localite.
  await step('Search for the localite', async () => {
    await localitesPage.open();
    await localitesPage.search(localiteName);
    await localitesPage.verifyLocaliteDisplayed(localiteName);
  });
});
