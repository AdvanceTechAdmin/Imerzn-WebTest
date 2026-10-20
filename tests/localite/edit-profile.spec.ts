import { readEditProfileData } from '@data/localite/edit-profile-data';
import { saveCreatedContent } from '@data/state/created-localite';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('PRF-002 | Localite edits name, bio, and hosted experiences', { tag: ['@localite'] }, async ({
  page, session, localite, guideProfilePage, editProfilePage,
}) => {
  test.setTimeout(90_000);

  // Pre-setup: new profile values from edit-profile.csv (unique last name per run).
  const data = await readEditProfileData();
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'New localite name', description: `${data.firstName} ${data.lastName}` },
  );

  // Step 1: Sign in as the localite (lands on the localite's profile page).
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(guideProfilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open Edit Profile and enter the new values.
  await step('Edit name, bio, and experiences', async () => {
    await guideProfilePage.editProfileLink.click();
    await editProfilePage.fillForm(data);
  });

  // Step 3: Save and verify the app returns to the profile.
  await step('Save the profile', async () => {
    await editProfilePage.save();
    await expect(page).toHaveURL(profileUrl, { timeout: 30_000 });
  });

  // Record the new name and bio so later tests (e.g. Preview Profile) expect them.
  await saveCreatedContent(localite.email, {
    firstName: data.firstName,
    lastName: data.lastName,
    bio: data.bio,
  });

  // Step 4: Verify the new values are displayed on the profile.
  await step('Verify the updated profile', async () => {
    await guideProfilePage.verifyProfileDetails(data);
  });
});
