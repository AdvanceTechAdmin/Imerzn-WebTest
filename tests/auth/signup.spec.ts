import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { SignupPage } from '../../pages/auth/signup-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { createSignupFormData, readAuthData } from '../../utils/auth-data';
import { closeNewsletterPopupIfVisible } from '../../utils/common';

test('AUTH-003 | Traveler can complete the signup process', async ({ page }) => {
  // Run only when explicitly enabled because signup may trigger real SMS verification.
  test.skip(
    process.env.RUN_SIGNUP_TEST !== 'true',
    'Set RUN_SIGNUP_TEST=true to run signup.',
  );

  // Prepare signup test data from the CSV file.
  const signupData = createSignupFormData(await readAuthData());
  const signupPage = new SignupPage(page);

  // Step 1: Open the signup page and select Traveler.
  const availability = await signupPage.openTravelerSignup();

  // Step 2: Enter all required signup information.
  await signupPage.fillForm(signupData);


  // Step 3: Submit the signup form.
  await signupPage.submit();

  // Step 4: Enter OTP .
  await test.step('Verify OTP number', async () => {
    await signupPage.verifyOTPNumber('000000');
  });


  // Step 5: Upload and save the cropped profile picture.
  await test.step('Upload and save profile picture', async () => {
    const profilePicturePath = resolve(
      process.cwd(),
      'testdata/profile-picture.jpg',
    );
    await signupPage.uploadProfilePicture(profilePicturePath);
    // Save the image in the Crop Profile Picture dialog.
    await signupPage.saveCroppedProfilePicture();
  });

  // Step 6: Submit the profile.
  await test.step('Submit profile', async () => {
    await signupPage.submitProfile();
        await closeNewsletterPopupIfVisible(page);

  });

  // Step 7: Verify that the Dashboard  is visible.
  await test.step('Verify Dashboard page', async () => {
    const guideProfilePage = new GuideProfilePage(page);

    await expect(guideProfilePage.dashboardLink).toBeVisible({
      timeout: 30_000,
    });
  });
});