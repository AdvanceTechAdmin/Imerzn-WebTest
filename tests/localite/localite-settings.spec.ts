import { readAuthData } from '@data/common/auth-data';
import { readLocaliteSettingsData } from '@data/localite/localite-settings-data';
import { readCreatedLocalite, saveCreatedContent, saveCreatedLocalite } from '@data/state/created-localite';
import { expect, test } from '@fixtures/test';
import { forgetSession } from '@fixtures/session';
import { step } from '@helpers/step';

test('SET-002 | Localite edits phone and Bio and changes password', { tag: ['@localite'] }, async ({
  page, session, loginPage, profileMenu, settingsPage,
}) => {
  test.setTimeout(150_000);

  // Pre-setup: only the localite created by LOC-001 (never the shared Login account,
  // whose password other tests read from auth.csv).
  const localite = await readCreatedLocalite();
  if (!localite) {
    throw new Error(
      'No created localite found (testdata/localite/created-localite.json). ' +
      'Run the localite signup test (LOC-001) first: npm run test:setup',
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

  // Step 1: Sign in as the localite.
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
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

  // Save the new password right away so other localite tests can still log in, and drop the
  // saved session: it belongs to the old password.
  await saveCreatedLocalite({ ...localite, password: newPassword });
  await forgetSession(localite.email);

  // Step 5: Log out.
  await step('Log out', async () => {
    await session.signOut();
  });

  // Step 6: Log in with the new password through the login form (this is what the test checks).
  await step('Log in with the new password', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, newPassword);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
  });
});
