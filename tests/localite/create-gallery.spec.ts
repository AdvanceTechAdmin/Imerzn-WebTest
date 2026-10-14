import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { CreateGalleryPage } from '../../pages/localite/create-gallery-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common';
import { getLocaliteAccount, saveCreatedContent } from '../../utils/created-localite';
import { readGalleryData } from '../../utils/gallery-data';

test('GAL-001 | Localite creates a gallery and it appears on the profile', async ({ page }) => {
  test.setTimeout(90_000);

  // Pre-setup: Prepare test data and page objects.
  const data = await readGalleryData();
  const localite = await getLocaliteAccount();
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Gallery title', description: data.title },
  );

  const loginPage = new LoginPage(page);
  const profilePage = new GuideProfilePage(page);
  const createGalleryPage = new CreateGalleryPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the localite.
  await step('Sign in as localite', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, localite.password);

    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(profilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open Create Gallery and fill in the form.
  await step('Fill in the Create Gallery form', async () => {
    await profilePage.createGalleryLink.click();
    await createGalleryPage.fillForm(data);
  });

  // Step 3: Save the gallery.
  await step('Save the gallery', async () => {
    await createGalleryPage.save();
  });

  // Step 4: Verify the gallery appears on the localite profile.
  await step('Verify the gallery on the localite profile', async () => {
    await profilePage.verifyGalleryDisplayed(profileUrl, data.title);
  });

  // Record the title so Preview Profile can verify it.
  await saveCreatedContent(localite.email, { galleryTitle: data.title });
});
