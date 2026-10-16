import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { LocaliteBookingsPage } from '../../pages/localite/localite-bookings-page';
import { DashboardPage } from '../../pages/traveler/dashboard-page';
import { MyBookingsPage } from '../../pages/traveler/my-bookings-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getLocaliteAccount } from '../../utils/localite/created-localite';
import { readBookingData } from '../../utils/traveler/booking-data';
import { getTravelerAccount, readCreatedBookings } from '../../utils/traveler/created-traveler';

/*
 * Cancels bookings made by tests/traveler/experience-booking.spec.ts. It is a step of the
 * booking flow in playwright.config.ts (after both dashboards, before the localite's cancel test).
 * It cancels the second paid (Ongoing) booking and the second pending booking.
 */
test('CNL-001 | Traveler cancels an Ongoing and a Pending booking; the localite sees them Cancelled', async ({ page }) => {
  test.setTimeout(180_000);

  // Pre-setup: traveler and localite accounts, the saved bookings, and the cancel reason.
  const traveler = await getTravelerAccount();
  const localite = await getLocaliteAccount();
  const { paid, pending } = await readCreatedBookings(traveler.email);
  const { cancelReason } = await readBookingData();
  // Cancel the last paid and the last pending booking, leaving the first ones as they are.
  const ongoingBooking = paid[paid.length - 1];
  const pendingBooking = pending[pending.length - 1];
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Cancelled Ongoing booking', description: ongoingBooking.date },
    { type: 'Cancelled Pending booking', description: pendingBooking.date },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const dashboardPage = new DashboardPage(page);
  const myBookingsPage = new MyBookingsPage(page);
  const localiteBookingsPage = new LocaliteBookingsPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler and open My Bookings.
  await step('Sign in as traveler and open My Bookings', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
    await profileMenu.dashboardLink.click();
    await dashboardPage.sectionLink('My Bookings').click();
    await expect(page).toHaveURL(/\/dashboard\/my-bookings/);
    await expect(myBookingsPage.statusCell(ongoingBooking.date)).toHaveText(/^(Ongoing|Cancelled)$/, { timeout: 30_000 });
  });

  // On a re-run the Ongoing booking may already be cancelled; then only the Pending one is cancelled.
  const ongoingAlreadyCancelled = (await myBookingsPage.statusCell(ongoingBooking.date).innerText()).trim() === 'Cancelled';
  if (ongoingAlreadyCancelled) {
    test.info().annotations.push({ type: 'Skipped', description: `Ongoing booking ${ongoingBooking.date} was already cancelled` });
  } else {
    // Step 2: Cancel icon on the Ongoing booking opens the Cancel Trip dialog.
    await step('Open Cancel Trip for the Ongoing booking', async () => {
      await myBookingsPage.openCancelDialog(ongoingBooking.date);
    });

    // Step 3: "Not Now" closes the dialog and the booking stays Ongoing.
    await step('Not Now keeps the booking Ongoing', async () => {
      await myBookingsPage.dismissCancel();
      await expect(myBookingsPage.statusCell(ongoingBooking.date)).toHaveText('Ongoing');
    });

    // Step 4: Cancel again, enter a reason, confirm; the booking becomes Cancelled.
    await step('Cancel the Ongoing booking', async () => {
      await myBookingsPage.openCancelDialog(ongoingBooking.date);
      await myBookingsPage.confirmCancel(cancelReason);
      await expect(myBookingsPage.statusCell(ongoingBooking.date)).toHaveText('Cancelled', { timeout: 30_000 });
    });
  }

  // Step 5: Cancel the Pending booking too.
  await step('Cancel the Pending booking', async () => {
    // Site bug: after one cancel, the dialog's Cancel Trip button stays disabled with a spinner
    // until the page is reloaded, so the second cancel starts from a fresh page.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(myBookingsPage.statusCell(pendingBooking.date)).toHaveText('Pending Payment', { timeout: 30_000 });
    await myBookingsPage.openCancelDialog(pendingBooking.date);
    await myBookingsPage.confirmCancel(cancelReason);
    await expect(myBookingsPage.statusCell(pendingBooking.date)).toHaveText('Cancelled', { timeout: 30_000 });
  });

  // Step 6: Log out and sign in as the localite.
  await step('Sign in as localite', async () => {
    await profileMenu.logOut();
    await loginPage.open();
    await loginPage.login(localite.email, localite.password);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
  });

  // Step 7: Localite My Bookings shows both cancelled bookings as Cancelled.
  await step('Verify both bookings are Cancelled for the localite', async () => {
    await profileMenu.dashboardLink.click();
    await dashboardPage.sectionLink('My Bookings').click();
    await expect(page).toHaveURL(/\/dashboard\/booking/);
    // The site spells it "Cancelled" in tables and "Canceled" in the status filter; accept either.
    const cancelled = /^Cancell?ed$/;
    await expect(localiteBookingsPage.statusCell(ongoingBooking.date)).toHaveText(cancelled, { timeout: 30_000 });
    await expect(localiteBookingsPage.statusCell(pendingBooking.date)).toHaveText(cancelled);
  });
});
