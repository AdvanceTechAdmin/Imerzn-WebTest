import { readGalleryData } from '@data/localite/gallery-data';
import { saveCreatedContent } from '@data/state/created-localite';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

/*
 * Setup test (runs after Create Experience): the localite creates a gallery. Its title is saved to
 * testdata/localite/created-content.json for Preview Profile.
 */
test('GAL-001 | Localite creates a gallery and it appears on the profile', { tag: ['@setup', '@localite'] }, async ({
  page, session, localite, guideProfilePage, createGalleryPage,
}) => {
  test.setTimeout(90_000);

  // Pre-setup: gallery data from create-gallery.csv (unique title per run).
  const data = await readGalleryData();
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Gallery title', description: data.title },
  );

  // Step 1: Sign in as the localite (lands on the localite's profile page).
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(guideProfilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open Create Gallery and fill in the form.
  await step('Fill in the Create Gallery form', async () => {
    await guideProfilePage.createGalleryLink.click();
    await createGalleryPage.fillForm(data);
  });

  // Step 3: Save the gallery.
  await step('Save the gallery', async () => {
    await createGalleryPage.save();
  });

  // Step 4: Verify the gallery appears on the localite profile.
  await step('Verify the gallery on the localite profile', async () => {
    await guideProfilePage.verifyGalleryDisplayed(profileUrl, data.title);
  });

  // Record the title so Preview Profile can verify it.
  await saveCreatedContent(localite.email, { galleryTitle: data.title });
});
