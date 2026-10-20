import { randomInt } from 'node:crypto';
import { readExperienceData } from '@data/localite/experience-data';
import { saveCreatedContent } from '@data/state/created-localite';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

/*
 * Setup test (runs after both signups): the localite publishes an experience. Its title is saved to
 * testdata/localite/created-content.json for Preview Profile, Experience Details, and the booking flow.
 */
test('EXP-002 | Localite creates and publishes an experience', { tag: ['@setup', '@localite'] }, async ({
  page, session, localite, guideProfilePage, createExperiencePage, experiencesPage,
}) => {
  test.setTimeout(90_000);

  // Pre-setup: form values from create-experience.csv, with a unique title for this run.
  const data = {
    ...(await readExperienceData()),
    title: `Automation Experience - ${randomInt(10_000, 100_000)}`,
  };
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Experience title', description: data.title },
  );

  // Step 1: Sign in as the localite (lands on the localite's profile page).
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(guideProfilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Open the Create Experience page and fill in the form.
  await step('Fill in the Create Experience form', async () => {
    await guideProfilePage.createExperienceLink.click();
    await expect(page).toHaveURL(/create-experience\/?$/);
    await expect(createExperiencePage.heading).toBeVisible();

    await createExperiencePage.fillForm(data);
    await expect(createExperiencePage.titleInput).toHaveValue(data.title);
  });

  // Step 3: Publish the experience and verify the API response.
  await step('Publish the experience', async () => {
    await createExperiencePage.publishAndVerify();
  });

  // Step 4: Verify the published experience appears on the profile.
  await step('Verify the published experience in localite profile', async () => {
    await guideProfilePage.verifyPublishedExperience(profileUrl, data.title);
  });

  // Record the title so Preview Profile, Experience Details, and the booking flow can find it.
  await saveCreatedContent(localite.email, { experienceTitle: data.title });

  // Step 5: Search for the created experience and verify the result.
  await step('Search for the created experience', async () => {
    await experiencesPage.openExperiences();
    await experiencesPage.searchExperience(data.title);
    await experiencesPage.verifyExperienceDisplayed(data.title);
  });
});
