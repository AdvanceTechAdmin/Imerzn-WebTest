import { readAuthData } from '@data/common/auth-data';
import { saveCreatedTraveler } from '@data/state/created-traveler';
import { readTravelerSettingsData } from '@data/traveler/traveler-settings-data';
import { expect, test } from '@fixtures/test';
import { forgetSession } from '@fixtures/session';
import { step } from '@helpers/step';

test('SET-001 | Traveler edits account details and changes password', { tag: ['@traveler'] }, async ({
  session, traveler, loginPage, profileMenu, settingsPage,
}) => {
  test.setTimeout(150_000);

  // Pre-setup: new details from traveler-settings.csv, and the new password.
  const data = await readTravelerSettingsData();
  const authData = await readAuthData();
  // If a previous run already set Traveler New Password, switch back to Signup Password
  // so the new password always differs from the current one.
  const newPassword = traveler.password === authData.travelerNewPassword
    ? authData.signupPassword
    : authData.travelerNewPassword;
  test.info().annotations.push({ type: 'Traveler email', description: traveler.email });

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await session.signIn(traveler);
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

  // Save the new password right away so later runs and tests can still log in, and drop the
  // saved session: it belongs to the old password.
  await saveCreatedTraveler({
    ...traveler,
    firstName: data.firstName,
    lastName: data.lastName,
    password: newPassword,
  });
  await forgetSession(traveler.email);

  // Step 5: Log out.
  await step('Log out', async () => {
    await session.signOut();
  });

  // Step 6: Log in with the new password through the login form (this is what the test checks).
  await step('Log in with the new password', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, newPassword);

    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
    await expect(profileMenu.greeting(data.firstName, data.lastName)).toBeVisible();
  });
});
