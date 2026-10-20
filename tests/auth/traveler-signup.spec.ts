import { resolve } from 'node:path';
import { env } from '@config/env';
import { createSignupFormData, readAuthData } from '@data/common/auth-data';
import { saveCreatedTraveler } from '@data/state/created-traveler';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

/*
 * Setup test (runs after localite signup): creates the traveler that the traveler tests and the booking flow use
 * (saved to testdata/traveler/created-traveler.json).
 */
test('AUTH-003 | Traveler can complete the signup process', { tag: ['@setup', '@traveler', '@signup'] }, async ({
  signupPage, guideProfilePage,
}) => {
  // Run only when explicitly enabled because signup may trigger real SMS verification.
  test.skip(!env.runSignup, 'Set RUN_SIGNUP_TEST=true to run signup.');

  // Pre-setup: signup data from auth.csv (the email gets a random suffix).
  const authData = await readAuthData();
  const signupData = createSignupFormData(authData);
  test.info().annotations.push({ type: 'Traveler email', description: signupData.email });

  // Step 1: Open the signup page, select Traveler, and fill in the form.
  await step('Fill in the traveler signup form', async () => {
    await signupPage.openTravelerSignup();
    await signupPage.fillForm(signupData);
  });

  // Step 2: Submit the signup form.
  await step('Submit the signup form', async () => {
    await signupPage.submit();
  });

  // Step 3: Enter the test OTP from auth.csv.
  await step('Verify OTP number', async () => {
    await signupPage.verifyOTPNumber(authData.signupOtp);
  });

  // Step 4: Upload the profile picture and save it in the Crop Profile Picture dialog.
  await step('Upload and save profile picture', async () => {
    await signupPage.uploadProfilePicture(resolve(process.cwd(), 'testdata/traveler/profile-picture.jpg'));
    await signupPage.saveCroppedProfilePicture();
  });

  // Step 5: Submit the profile.
  await step('Submit profile', async () => {
    await signupPage.submitProfile();
  });

  // Step 6: Verify that the Dashboard link is visible (the traveler is signed in).
  await step('Verify Dashboard page', async () => {
    await expect(guideProfilePage.dashboardLink).toBeVisible({ timeout: 30_000 });
  });

  // Save the account so traveler tests (e.g. Wishlist) can log in with it.
  await saveCreatedTraveler({
    email: signupData.email,
    password: signupData.password,
    firstName: signupData.firstName,
    lastName: signupData.lastName,
  });
});
