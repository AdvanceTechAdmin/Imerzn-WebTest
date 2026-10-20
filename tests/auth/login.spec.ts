import { readAuthData, withEmailSuffix } from '@data/common/auth-data';
import { expect, test } from '@fixtures/test';
import { randomSixDigits } from '@helpers/text';

// These tests are about the login form itself, so they use LoginPage directly (not session.signIn).

test('AUTH-001 | Login fails with an unregistered email', { tag: ['@auth'] }, async ({ loginPage }) => {
  // Pre-setup: the Login account's password with an email that is not registered (random suffix).
  const { loginEmail, loginPassword } = await readAuthData();
  const unregisteredEmail = withEmailSuffix(loginEmail, randomSixDigits());

  // Step 1: Open the login page and submit the unregistered credentials.
  await loginPage.open();
  await loginPage.login(unregisteredEmail, loginPassword);

  // Step 2: Verify that the application displays the expected error message.
  const errorMessage = loginPage.getLoginErrorMessage();
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toHaveText('Invalid username or password');
});

test('AUTH-002 | Registered user can access the Dashboard', { tag: ['@auth'] }, async ({
  page, loginPage, guideProfilePage,
}) => {
  // Pre-setup: the registered Login account from auth.csv.
  const { loginEmail, loginPassword } = await readAuthData();

  // Step 1: Open the login page and submit the valid credentials.
  await loginPage.open();
  await loginPage.login(loginEmail, loginPassword);

  // Step 2: Verify that login redirects the user to the expected profile page.
  await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });

  // Step 3: Verify that the Dashboard link is visible after successful login.
  await expect(guideProfilePage.dashboardLink).toBeVisible();
});
