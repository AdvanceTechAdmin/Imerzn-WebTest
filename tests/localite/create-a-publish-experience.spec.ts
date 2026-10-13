import { randomInt } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { CreateExperiencePage } from '../../pages/localite/create-experience-page';
import { FindTouristGuidePage } from '../../pages/localite/find-tourist-guide-page';
import { GuideProfilePage } from '../../pages/localite/guide-profile-page';
import { LoginPage } from '../../pages/auth/login-page';
import { readExperienceData } from '../../utils/experience-data';
import { step } from '../../utils/steps';
import { closeNewsletterPopupIfVisible } from '../../utils/common';

test('Create Experience', async ({ page }) => {
  // Pre-setup: Prepare test data and page objects.
  test.setTimeout(90_000);

  const data = {
    ...(await readExperienceData()),
    title: `Automation Experience - ${randomInt(10_000, 100_000)}`,
  };

  const password = process.env.IMERZN_PASSWORD;
  if (!password) {
    throw new Error('Set IMERZN_PASSWORD before running this test.');
  }

  const loginPage = new LoginPage(page);
  const profilePage = new GuideProfilePage(page);
  const createExperiencePage = new CreateExperiencePage(page);
  const findTouristGuidePage = new FindTouristGuidePage(page);

  // Steps 1: Sign in to the test account.
  await step('[STEP] Sign in to the test account', async () => {
    await loginPage.open();
    await closeNewsletterPopupIfVisible(page);

    await loginPage.login('phuonglocalite@yopmail.com', password);
    await closeNewsletterPopupIfVisible(page);

    await expect(page).toHaveURL(/guide_detailed_page/, {
      timeout: 60_000,
    });
    await expect(profilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Steps 2: Open the Create Experience page and fill in the form.
  await step('[STEP] Fill in the Create Experience form', async () => {
    await closeNewsletterPopupIfVisible(page);

    await profilePage.createExperienceLink.click();
    await expect(page).toHaveURL(/create-experience\/?$/);

    await closeNewsletterPopupIfVisible(page);
    await expect(createExperiencePage.heading).toBeVisible();

    await createExperiencePage.fillForm(data);
    await closeNewsletterPopupIfVisible(page);

    await expect(createExperiencePage.titleInput).toHaveValue(data.title);
  });

  // Steps 3: Publish the experience and verify the API response.
  await step('[STEP] Publish the experience', async () => {
    await closeNewsletterPopupIfVisible(page);
    await createExperiencePage.publishAndVerify();
  });

  // Steps 4: Verify the published experience appears on the profile.
  await step('[STEP] Verify the published experience in localite profile', async () => {
    await closeNewsletterPopupIfVisible(page);
    await profilePage.verifyPublishedExperience(profileUrl, data.title);
    await closeNewsletterPopupIfVisible(page);
  });

   // Steps 5: Search for the created experience and verify the result.
  await step('[STEP] Search for the created experience', async () => {

    await findTouristGuidePage.openExperiences();

    await findTouristGuidePage.searchExperience(data.title);

    await closeNewsletterPopupIfVisible(page);

    await findTouristGuidePage.verifyExperienceDisplayed(data.title);
  });
});