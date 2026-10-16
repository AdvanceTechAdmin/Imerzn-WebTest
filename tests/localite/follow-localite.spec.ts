import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { createFollowerEmail, readAuthData } from '../../utils/common/auth-data';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getLocaliteAccount } from '../../utils/localite/created-localite';

test('FOL-001 | Follow a localite by email from the profile', async ({ page }) => {
  test.setTimeout(90_000);

  // Pre-setup: Localite account and a unique follower email (Follower Email + 6 random digits).
  const localite = await getLocaliteAccount();
  const followerEmail = createFollowerEmail(await readAuthData());
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Follower email', description: followerEmail },
  );

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

  // Step 2: Click Follow and verify the Join the Journey dialog.
  await step('Open the Join the Journey dialog', async () => {
    await profilePage.openFollowDialog();
  });

  // Step 3: Enter an email and click Follow.
  await step('Follow with email', async () => {
    await profilePage.followWithEmail(followerEmail);
  });

  // Step 4: Verify the success message and that the app is back on the profile.
  await step('Verify follow succeeded', async () => {
    await expect(profilePage.followSuccessMessage).toBeVisible();
    await expect(profilePage.joinJourneyDialog).toBeHidden();
    await expect(page).toHaveURL(profileUrl);
    await expect(profilePage.followButton).toBeVisible();
  });
});
