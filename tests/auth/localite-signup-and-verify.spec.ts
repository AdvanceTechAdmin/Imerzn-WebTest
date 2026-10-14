import { expect, test } from '@playwright/test';
import { AdminLoginPage } from '../../pages/admin/admin-login-page';
import { AdminUserDetailPage } from '../../pages/admin/admin-user-detail-page';
import { AdminUsersPage } from '../../pages/admin/admin-users-page';
import { SignupPage } from '../../pages/auth/signup-page';
import { CreateGuideProfilePage } from '../../pages/localite/create-guide-profile-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { createLocaliteSignupData, readAuthData } from '../../utils/auth-data';
import { autoCloseNewsletterPopup, step } from '../../utils/common';
import { saveCreatedLocalite } from '../../utils/created-localite';

test('LOC-001 | New localite signs up and is verified by an admin', async ({ page }) => {
  // Run only when explicitly enabled because signup creates a real account.
  test.skip(
    process.env.RUN_SIGNUP_TEST !== 'true',
    'Set RUN_SIGNUP_TEST=true to run signup.',
  );
  test.setTimeout(180_000);

  // Pre-setup: Prepare test data and page objects.
  const authData = await readAuthData();
  const { signup, profile } = createLocaliteSignupData(authData);
  test.info().annotations.push({ type: 'Localite email', description: signup.email });

  const signupPage = new SignupPage(page);
  const createProfilePage = new CreateGuideProfilePage(page);
  const guideProfilePage = new GuideProfilePage(page);
  const adminLoginPage = new AdminLoginPage(page);
  const adminUsersPage = new AdminUsersPage(page);
  const adminUserDetailPage = new AdminUserDetailPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Open the home page and sign up as a Localite.
  await step('Sign up as a new Localite', async () => {
    await signupPage.openLocaliteSignupFromHome();
    await signupPage.fillForm(signup);
    await signupPage.submit();
  });

  // Step 2: Verify the phone number with the test OTP from auth.csv.
  await step('Verify phone number', async () => {
    await signupPage.verifyOTPNumber(authData.signupOtp);
    await expect(page).toHaveURL(/create_guide_profiles/, { timeout: 30_000 });
  });

  // Step 3: Complete the Create Your Profile form and submit it.
  await step('Create the localite profile', async () => {
    await createProfilePage.fillForm(profile);
    await createProfilePage.submit();

    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(guideProfilePage.dashboardLink).toBeVisible();
  });

  // Save the account as soon as it exists, so other localite tests log in with it
  // even if an admin step below fails.
  await saveCreatedLocalite({
    email: signup.email,
    password: signup.password,
    firstName: signup.firstName,
    lastName: signup.lastName,
    bio: profile.bio,
  });

  // Step 4: Sign in to the admin portal.
  await step('Sign in to the admin portal', async () => {
    await adminLoginPage.open();
    await adminLoginPage.login(authData.adminEmail, authData.adminPassword);
  });

  // Step 5: Find the new localite in Users > LOCALITE and open it.
  await step('Open the new localite in admin Users', async () => {
    await adminUsersPage.open();
    await adminUsersPage.selectUserRole('LOCALITE');
    await adminUsersPage.searchUser(signup.email);
    await adminUsersPage.openRowAction(signup.email, 'View');
  });

  // Step 6: Enable Verified and save.
  await step('Mark the localite as Verified', async () => {
    await adminUserDetailPage.markVerifiedAndSave();
  });
});
