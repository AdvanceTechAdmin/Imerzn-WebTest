import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('PRF-003 | Localite opens and closes Profile Sharing from the profile', { tag: ['@localite'] }, async ({
  page, session, localite, guideProfilePage,
}) => {
  test.setTimeout(90_000);

  // Pre-setup: the localite fixture's name and bio include any Edit Profile / Settings changes.
  test.info().annotations.push({ type: 'Localite email', description: localite.email });

  // Step 1: Sign in as the localite (lands on the localite's profile page).
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(guideProfilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open Share Profile and verify the dialog shows the name and bio.
  await step('Open Profile Sharing', async () => {
    await guideProfilePage.shareProfileButton.click();
    await guideProfilePage.shareDialog.verifyDetails(localite.firstName, localite.lastName, localite.bio);
  });

  // Step 3: Close the dialog and verify the app is back on the profile.
  await step('Close Profile Sharing', async () => {
    await guideProfilePage.shareDialog.close();

    await expect(page).toHaveURL(profileUrl);
    await expect(guideProfilePage.shareProfileButton).toBeVisible();
  });
});
