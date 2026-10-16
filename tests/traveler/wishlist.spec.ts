import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { FindTouristGuidePage } from '../../pages/localite/find-tourist-guide-page';
import { WishlistPage } from '../../pages/traveler/wishlist-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getTravelerAccount } from '../../utils/traveler/created-traveler';
import { readWishlistName } from '../../utils/traveler/wishlist-data';

test('WSH-001 | Traveler creates a wishlist and saves an experience to it', async ({ page }) => {
  test.setTimeout(120_000);

  // Pre-setup: Traveler saved by AUTH-003 and a unique wishlist name.
  const traveler = await getTravelerAccount();
  const wishlistName = await readWishlistName();
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Wishlist name', description: wishlistName },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const wishlistPage = new WishlistPage(page);
  const experiencesPage = new FindTouristGuidePage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
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
