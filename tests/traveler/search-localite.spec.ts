import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('SRCH-001 | Traveler finds the created localite by search', { tag: ['@traveler'] }, async ({
  session, traveler, localite, profileMenu, localitesPage,
}) => {
  test.setTimeout(120_000);

  // Pre-setup: the localite's latest name (includes Edit Profile changes).
  const localiteName = `${localite.firstName} ${localite.lastName}`;
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Localite', description: localiteName },
  );

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await session.signIn(traveler);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Search Localites for the localite.
  await step('Search for the localite', async () => {
    await localitesPage.open();
    await localitesPage.search(localiteName);
    await localitesPage.verifyLocaliteDisplayed(localiteName);
  });
});
