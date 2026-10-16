import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { SettingsPage } from '../../pages/common/settings-page';
import { readAuthData } from '../../utils/common/auth-data';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getTravelerAccount, saveCreatedTraveler } from '../../utils/traveler/created-traveler';
import { readTravelerSettingsData } from '../../utils/traveler/traveler-settings-data';

test('SET-001 | Traveler edits account details and changes password', async ({ page }) => {
  test.setTimeout(150_000);

  // Pre-setup: Traveler saved by AUTH-003, new details, and the new password.
  const traveler = await getTravelerAccount();
  const data = await readTravelerSettingsData();
  const authData = await readAuthData();
  // If a previous run already set Traveler New Password, switch back to Signup Password
  // so the new password always differs from the current one.
  const newPassword = traveler.password === authData.travelerNewPassword
    ? authData.signupPassword
    : authData.travelerNewPassword;
  test.info().annotations.push({ type: 'Traveler email', description: traveler.email });

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const settingsPage = new SettingsPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Open Settings, edit name and phone, and save.
  await step('Edit account details', async () => {
    await profileMenu.openSettings();
    await settingsPage.open();
    await settingsPage.editAccountDetails(data);
    await settingsPage.saveChanges();
  });

  // Keep the saved account in sync so other traveler tests expect the new name.
  await saveCreatedTraveler({ ...traveler, firstName: data.firstName, lastName: data.lastName });

  // Step 3: Verify the new details are displayed.
  await step('Verify account details', async () => {
    await settingsPage.verifyAccountDetails(data);
  });

  // Step 4: Change the password.
  await step('Change password', async () => {
    await settingsPage.changePassword(traveler.password, newPassword);
  });

  // Save the new password right away so later runs and tests can still log in.
  await saveCreatedTraveler({
    ...traveler,
    firstName: data.firstName,
    lastName: data.lastName,
    password: newPassword,
  });

  // Step 5: Log out.
  await step('Log out', async () => {
    await profileMenu.logOut();
  });

  // Step 6: Log in with the new password and verify it succeeds.
  await step('Log in with the new password', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, newPassword);

    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
    await expect(profileMenu.greeting(data.firstName, data.lastName)).toBeVisible();
  });
});
