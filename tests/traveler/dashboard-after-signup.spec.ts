import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';
import type { DashboardSection } from '@pages/traveler/dashboard-page';

test('DSH-001 | New traveler dashboard shows no trips, bookings, transactions, notifications, or messages', { tag: ['@traveler'] }, async ({
  session, traveler, profileMenu, dashboardPage,
}) => {
  test.setTimeout(120_000);

  // Pre-setup: the traveler created by AUTH-003 is new, so every section should be empty.
  test.info().annotations.push({ type: 'Traveler email', description: traveler.email });

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await session.signIn(traveler);
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
