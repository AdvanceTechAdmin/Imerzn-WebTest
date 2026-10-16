import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { PreviewProfilePage } from '../../pages/localite/preview-profile-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getLocaliteAccount, readCreatedContent } from '../../utils/localite/created-localite';

test('PRF-001 | Localite previews profile, follows, shares, and goes back', async ({ page }) => {
  test.setTimeout(90_000);

  // Pre-setup: The localite account and the experience/gallery created by earlier tests.
  const localite = await getLocaliteAccount();
  const { experienceTitle, galleryTitle } = await readCreatedContent(localite.email);
  if (!experienceTitle || !galleryTitle) {
    throw new Error(
      `No created experience/gallery recorded for ${localite.email}. ` +
      'Run Create Experience and GAL-001 first (testdata/localite/created-content.json).',
    );
  }
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Experience title', description: experienceTitle },
    { type: 'Gallery title', description: galleryTitle },
  );

  const loginPage = new LoginPage(page);
  const profilePage = new GuideProfilePage(page);
  const previewPage = new PreviewProfilePage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the localite.
  await step('Sign in as localite', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, localite.password);

    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(profilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open Preview Profile.
  await step('Open Preview Profile', async () => {
    await profilePage.previewProfileLink.click();
    await expect(page).toHaveURL(/\/preview-profile\//);
  });

  // Step 3: Verify name, bio, created experience, and created gallery.
  await step('Verify profile details on the preview', async () => {
    await previewPage.verifyProfileDetails({
      firstName: localite.firstName,
      lastName: localite.lastName,
      bio: localite.bio,
      experienceTitle,
      galleryTitle,
    });
  });

  // Step 4: Follow changes to Following.
  await step('Follow the profile', async () => {
    await previewPage.followAndVerify();
  });

  // Step 5: Profile Sharing dialog shows the bio, then close it.
  await step('Share the profile', async () => {
    await previewPage.openShareDialogAndVerify(localite.firstName, localite.lastName, localite.bio);
    await previewPage.closeShareDialog();
  });

  // Step 6: Back returns to the profile screen.
  await step('Go back to the profile', async () => {
    await previewPage.backLink.click();
    await expect(page).toHaveURL(profileUrl);
    await expect(profilePage.previewProfileLink).toBeVisible();
  });
});
