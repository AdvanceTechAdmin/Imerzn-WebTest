import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { LocalitesPage } from '../../pages/traveler/localites-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getLocaliteAccount } from '../../utils/localite/created-localite';
import { getTravelerAccount } from '../../utils/traveler/created-traveler';

test('SRCH-001 | Traveler finds the created localite by search', async ({ page }) => {
  test.setTimeout(120_000);

  // Pre-setup: Traveler from AUTH-003; latest localite name from the localite tests.
  const traveler = await getTravelerAccount();
  const localite = await getLocaliteAccount();
  const localiteName = `${localite.firstName} ${localite.lastName}`;
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Localite', description: localiteName },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const localitesPage = new LocalitesPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Search Localites for the localite.
  await step('Search for the localite', async () => {
    await localitesPage.open();
    await localitesPage.search(localiteName);
    await localitesPage.verifyLocaliteDisplayed(localiteName);
  });
});
