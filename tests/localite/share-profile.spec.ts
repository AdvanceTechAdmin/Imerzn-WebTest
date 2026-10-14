import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common';
import { getLocaliteAccount } from '../../utils/created-localite';

test('PRF-003 | Localite opens and closes Profile Sharing from the profile', async ({ page }) => {
  test.setTimeout(90_000);

  // Pre-setup: Localite account (name and bio include any Edit Profile changes).
  const localite = await getLocaliteAccount();
  test.info().annotations.push({ type: 'Localite email', description: localite.email });

  const loginPage = new LoginPage(page);
  const profilePage = new GuideProfilePage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the localite.
  await step('Sign in as localite', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, localite.password);

    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(profilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open Share Profile and verify the dialog shows the bio.
  await step('Open Profile Sharing', async () => {
    await profilePage.shareProfileButton.click();
    await profilePage.shareDialog.verifyDetails(localite.firstName, localite.lastName, localite.bio);
  });

  // Step 3: Close the dialog and verify the app is back on the profile.
  await step('Close Profile Sharing', async () => {
    await profilePage.shareDialog.close();

    await expect(page).toHaveURL(profileUrl);
    await expect(profilePage.shareProfileButton).toBeVisible();
  });
});
