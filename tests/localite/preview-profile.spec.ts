import { readCreatedContent } from '@data/state/created-localite';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('PRF-001 | Localite previews profile, follows, shares, and goes back', { tag: ['@localite'] }, async ({
  page, session, localite, guideProfilePage, previewProfilePage,
}) => {
  test.setTimeout(90_000);

  // Pre-setup: the experience and gallery created by the setup tests (create-experience and create-gallery).
  const { experienceTitle, galleryTitle } = await readCreatedContent(localite.email);
  if (!experienceTitle || !galleryTitle) {
    throw new Error(
      `No created experience/gallery recorded for ${localite.email}. ` +
      'Run the setup tests first (npm run test:setup); they record them in testdata/localite/created-content.json.',
    );
  }
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Experience title', description: experienceTitle },
    { type: 'Gallery title', description: galleryTitle },
  );

  // Step 1: Sign in as the localite (lands on the localite's profile page).
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(guideProfilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open Preview Profile.
  await step('Open Preview Profile', async () => {
    await guideProfilePage.previewProfileLink.click();
    await expect(page).toHaveURL(/\/preview-profile\//);
  });

  // Step 3: Verify name, bio, created experience, and created gallery.
  await step('Verify profile details on the preview', async () => {
    await previewProfilePage.verifyProfileDetails({
      firstName: localite.firstName,
      lastName: localite.lastName,
      bio: localite.bio,
      experienceTitle,
      galleryTitle,
    });
  });

  // Step 4: Follow changes to Following.
  await step('Follow the profile', async () => {
    await previewProfilePage.followAndVerify();
  });

  // Step 5: Profile Sharing dialog shows the bio, then close it.
  await step('Share the profile', async () => {
    await previewProfilePage.openShareDialogAndVerify(localite.firstName, localite.lastName, localite.bio);
    await previewProfilePage.closeShareDialog();
  });

  // Step 6: Back returns to the profile screen.
  await step('Go back to the profile', async () => {
    await previewProfilePage.backLink.click();
    await expect(page).toHaveURL(profileUrl);
    await expect(guideProfilePage.previewProfileLink).toBeVisible();
  });
});
