import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { DashboardPage, type DashboardSection } from '../../pages/traveler/dashboard-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getTravelerAccount } from '../../utils/traveler/created-traveler';

test('DSH-001 | New traveler dashboard shows no trips, bookings, transactions, notifications, or messages', async ({ page }) => {
  test.setTimeout(120_000);

  // Pre-setup: Traveler created by AUTH-003 (new, so every section should be empty).
  const traveler = await getTravelerAccount();
  test.info().annotations.push({ type: 'Traveler email', description: traveler.email });

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const dashboardPage = new DashboardPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Dashboard shows Total Trips 0.
  await step('Verify Total Trips is 0', async () => {
    await profileMenu.dashboardLink.click();
    await dashboardPage.expectOnDashboard();
    await dashboardPage.verifyTotalTrips(0);
  });

  // Steps 3-6: Each sidebar section shows "No Results Found".
  const sections: DashboardSection[] = ['My Bookings', 'Transactions', 'Notifications', 'Messages'];
  for (const section of sections) {
    await step(`Verify ${section} shows No Results Found`, async () => {
      await dashboardPage.verifySectionIsEmpty(section);
    });
  }
});
