import { readWishlistName } from '@data/traveler/wishlist-data';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('WSH-001 | Traveler creates a wishlist and saves an experience to it', { tag: ['@traveler'] }, async ({
  session, traveler, profileMenu, wishlistPage, experiencesPage,
}) => {
  test.setTimeout(120_000);

  // Pre-setup: a unique wishlist name from wishlist.csv.
  const wishlistName = await readWishlistName();
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Wishlist name', description: wishlistName },
  );

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await session.signIn(traveler);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Open Wishlist from the profile menu and create a wishlist.
  await step('Create a wishlist', async () => {
    await profileMenu.openWishlist();
    await wishlistPage.createWishlist(wishlistName);
  });

  // Step 3: Open Experiences and pick an experience; skip if none are available.
  const experience = await step('Open Experiences', async () => {
    await experiencesPage.openExperiences();
    return experiencesPage.firstExperienceCard();
  });
  test.skip(!experience, 'There are no experience available');
  if (!experience) return;
  test.info().annotations.push({ type: 'Experience', description: experience.title });

  // Step 4: Click the heart and save the experience to the new wishlist.
  await step('Save the experience to the wishlist', async () => {
    await experiencesPage.openSaveToWishlist(experience);
    await experiencesPage.saveToWishlistDialog.saveTo(wishlistName);
  });

  // Step 5: Open the wishlist and verify the saved experience.
  await step('Verify the experience in the wishlist', async () => {
    await profileMenu.openWishlist();
    await wishlistPage.openWishlist(wishlistName);
    await wishlistPage.verifySavedExperience(experience);
  });
});
