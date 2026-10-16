import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { readAuthData } from '../../utils/common/auth-data';
import { autoCloseNewsletterPopup } from '../../utils/common/common';

// Keep the newsletter popup and cookie banner from covering the login form.
test.beforeEach(async ({ page }) => {
  await autoCloseNewsletterPopup(page);
});

// Test 1: Verify that an unregistered email cannot log in.

test('AUTH-001 | Login fails with an unregistered email', async ({ page }) => {
  // Preparation: Read the test account credentials from the CSV file.
  const { loginEmail, loginPassword } = await readAuthData();

  // Preparation: Generate a random six-digit number for an unregistered email.
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  const unregisteredEmail = loginEmail.replace(
    '@',
    `+${randomNumber}@`,
  );

  // Steps 1: Open the login page and submit the unregistered credentials.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(unregisteredEmail, loginPassword);

  // Steps 2: Verify that the application displays the expected error message.
  const errorMessage = loginPage.getLoginErrorMessage();

  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toHaveText(
    'Invalid username or password',
  );
});

// Test 2: Verify that a registered user can log in successfully.
test('AUTH-002 | Registered user can access the Dashboard', async ({ page }) => {
  // Read the registered user's credentials from the CSV file.
  const { loginEmail, loginPassword } = await readAuthData();

  // Step 1: Open the login page and submit the valid credentials.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(loginEmail, loginPassword);

  // Step 2: Verify that login redirects the user to the expected profile page.
  await expect(page).toHaveURL(/guide_detailed_page/, {
    timeout: 60_000,
  });

  // Step 3: Verify that the Dashboard link is visible after successful login.
  const guideProfilePage = new GuideProfilePage(page);
  await expect(guideProfilePage.dashboardLink).toBeVisible();
});