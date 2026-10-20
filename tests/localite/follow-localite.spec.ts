import { createFollowerEmail, readAuthData } from '@data/common/auth-data';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('FOL-001 | Follow a localite by email from the profile', { tag: ['@localite'] }, async ({
  page, session, localite, guideProfilePage,
}) => {
  test.setTimeout(90_000);

  // Pre-setup: a unique follower email (Follower Email + 6 random digits).
  const followerEmail = createFollowerEmail(await readAuthData());
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Follower email', description: followerEmail },
  );

  // Step 1: Sign in as the localite (lands on the localite's profile page).
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(guideProfilePage.dashboardLink).toBeVisible();
  });

  const profileUrl = page.url();

  // Step 2: Click Follow and verify the Join the Journey dialog.
  await step('Open the Join the Journey dialog', async () => {
    await guideProfilePage.openFollowDialog();
  });

  // Step 3: Enter an email and click Follow.
  await step('Follow with email', async () => {
    await guideProfilePage.followWithEmail(followerEmail);
  });

  // Step 4: Verify the success message and that the app is back on the profile.
  await step('Verify follow succeeded', async () => {
    await expect(guideProfilePage.followSuccessMessage).toBeVisible();
    await expect(guideProfilePage.joinJourneyDialog).toBeHidden();
    await expect(page).toHaveURL(profileUrl);
    await expect(guideProfilePage.followButton).toBeVisible();
  });
});
