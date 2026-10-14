import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { SettingsPage } from '../../pages/common/settings-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { readAuthData } from '../../utils/auth-data';
import { autoCloseNewsletterPopup, step } from '../../utils/common';
import {
  readCreatedLocalite,
  saveCreatedContent,
  saveCreatedLocalite,
} from '../../utils/created-localite';
import { readLocaliteSettingsData } from '../../utils/localite-settings-data';

test('SET-002 | Localite edits phone and Bio and changes password', async ({ page }) => {
  test.setTimeout(150_000);

  // Pre-setup: only the localite created by LOC-001 (never the shared Login account,
  // whose password other tests read from auth.csv).
  const localite = await readCreatedLocalite();
  if (!localite) {
    throw new Error(
      'No created localite found (testdata/localite/created-localite.json). ' +
      'Run the localite signup test (LOC-001) first.',
    );
  }
  const data = await readLocaliteSettingsData();
  const authData = await readAuthData();
  // If a previous run already set Localite New Password, switch back to Signup Password
  // so the new password always differs from the current one.
  const newPassword = localite.password === authData.localiteNewPassword
    ? authData.signupPassword
    : authData.localiteNewPassword;
  test.info().annotations.push({ type: 'Localite email', description: localite.email });

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const settingsPage = new SettingsPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the localite.
  await step('Sign in as localite', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, localite.password);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Dashboard > Settings > Edit, change phone and Bio, and save.
  await step('Edit phone and Bio', async () => {
    await profileMenu.openSettingsFromDashboard();
    await settingsPage.open();
    await settingsPage.editPhoneAndBio(data);
    await settingsPage.saveChanges();
  });

  // Record the new Bio so profile tests (Preview/Share Profile) expect it.
  await saveCreatedContent(localite.email, { bio: data.bio });

  // Step 3: Verify the saved phone and Bio, including after a reload.
  await step('Verify phone and Bio are saved', async () => {
    await settingsPage.verifyPhoneAndBio(data.phone, data.bio);
    await page.reload();
    await settingsPage.open();
    await settingsPage.verifyPhoneAndBio(data.phone, data.bio);
  });

  // Step 4: Change the password.
  await step('Change password', async () => {
    await settingsPage.changePassword(localite.password, newPassword);
  });

  // Save the new password right away so other localite tests can still log in.
  await saveCreatedLocalite({ ...localite, password: newPassword });

  // Step 5: Log out, then log in with the new password.
  await step('Log out', async () => {
    await profileMenu.logOut();
  });

  await step('Log in with the new password', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, newPassword);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
  });
});
