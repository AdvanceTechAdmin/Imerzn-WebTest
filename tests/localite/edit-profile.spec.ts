import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { EditProfilePage } from '../../pages/localite/edit-profile-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common';
import { getLocaliteAccount, saveCreatedContent } from '../../utils/created-localite';
import { readEditProfileData } from '../../utils/edit-profile-data';

test('PRF-002 | Localite edits name, bio, and hosted experiences', async ({ page }) => {
  test.setTimeout(90_000);

  // Pre-setup: Localite account and new profile values from edit-profile.csv.
  const localite = await getLocaliteAccount();
  const data = await readEditProfileData();
  test.info().annotations.push({ type: 'Localite email', description: localite.email });

  const loginPage = new LoginPage(page);
  const profilePage = new GuideProfilePage(page);
  const editProfilePage = new EditProfilePage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the localite.
  await step('Sign in as localite', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, localite.password);

    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(profilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open Edit Profile and enter the new values.
  await step('Edit name, bio, and experiences', async () => {
    await profilePage.editProfileLink.click();
    await editProfilePage.fillForm(data);
  });

  // Step 3: Save and verify the app returns to the profile.
  await step('Save the profile', async () => {
    await editProfilePage.save();
    await expect(page).toHaveURL(profileUrl, { timeout: 30_000 });
  });

  // Record the new name and bio so later tests (e.g. Preview Profile) expect them.
  await saveCreatedContent(localite.email, {
    firstName: data.firstName,
    lastName: data.lastName,
    bio: data.bio,
  });

  // Step 4: Verify the new values are displayed on the profile.
  await step('Verify the updated profile', async () => {
    await profilePage.verifyProfileDetails(data);
  });
});
