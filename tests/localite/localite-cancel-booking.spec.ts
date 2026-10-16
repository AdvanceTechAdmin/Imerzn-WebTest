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
 * Cancels bookings made by tests/traveler/experience-booking.spec.ts. It is the last step of the
 * booking flow in playwright.config.ts (after both dashboards and the traveler's cancel test).
 * It cancels the first paid (Ongoing) booking and the first pending booking;
 * tests/traveler/cancel-booking.spec.ts cancels the last ones.
 */
test('LCN-001 | Localite cancels an Ongoing and a Pending booking; the traveler sees them Cancelled', async ({ page }) => {
  test.setTimeout(180_000);

  // Pre-setup: localite and traveler accounts, the saved bookings, and the cancel reason.
  const localite = await getLocaliteAccount();
  const traveler = await getTravelerAccount();
  const { paid, pending } = await readCreatedBookings(traveler.email);
  const { localiteCancelReason } = await readBookingData();
  const ongoingBooking = paid[0];
  const pendingBooking = pending[0];
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Cancelled Ongoing booking', description: ongoingBooking.date },
    { type: 'Cancelled Pending booking', description: pendingBooking.date },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const dashboardPage = new DashboardPage(page);
  const localiteBookingsPage = new LocaliteBookingsPage(page);
  const myBookingsPage = new MyBookingsPage(page);
  // The site spells it "Cancelled" in tables and "Canceled" in the status filter; accept either.
  const cancelled = /^Cancell?ed$/;

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the localite and open My Bookings.
  await step('Sign in as localite and open My Bookings', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, localite.password);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
    await profileMenu.dashboardLink.click();
    await dashboardPage.sectionLink('My Bookings').click();
    await expect(page).toHaveURL(/\/dashboard\/booking/);
    await expect(localiteBookingsPage.statusCell(ongoingBooking.date)).toHaveText(/^(Ongoing|Cancell?ed)$/, { timeout: 30_000 });
  });

  // On a re-run the Ongoing booking may already be cancelled; then only the Pending one is cancelled.
  const ongoingAlreadyCancelled = cancelled.test((await localiteBookingsPage.statusCell(ongoingBooking.date).innerText()).trim());
  if (ongoingAlreadyCancelled) {
    test.info().annotations.push({ type: 'Skipped', description: `Ongoing booking ${ongoingBooking.date} was already cancelled` });
  } else {
    // Step 2: Cancel icon on the Ongoing booking opens the Cancel Booking dialog.
    await step('Open Cancel Booking for the Ongoing booking', async () => {
      await localiteBookingsPage.openCancelDialog(ongoingBooking.date);
    });

    // Step 3: "Not Now" closes the dialog and the booking stays Ongoing.
    await step('Not Now keeps the booking Ongoing', async () => {
      await localiteBookingsPage.dismissCancel();
      await expect(localiteBookingsPage.statusCell(ongoingBooking.date)).toHaveText('Ongoing');
    });

    // Step 4: Cancel again, enter a reason, confirm; the booking becomes Cancelled.
    await step('Cancel the Ongoing booking', async () => {
      await localiteBookingsPage.openCancelDialog(ongoingBooking.date);
      await localiteBookingsPage.confirmCancel(localiteCancelReason);
      await expect(localiteBookingsPage.statusCell(ongoingBooking.date)).toHaveText(cancelled, { timeout: 30_000 });
    });
  }

  // Step 5: Cancel the Pending booking too.
  await step('Cancel the Pending booking', async () => {
    // Site bug: after one cancel, the dialog's confirm button stays disabled with a spinner
    // until the page is reloaded, so the second cancel starts from a fresh page.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(localiteBookingsPage.statusCell(pendingBooking.date)).toHaveText('Pending', { timeout: 30_000 });
    await localiteBookingsPage.openCancelDialog(pendingBooking.date);
    await localiteBookingsPage.confirmCancel(localiteCancelReason);
    await expect(localiteBookingsPage.statusCell(pendingBooking.date)).toHaveText(cancelled, { timeout: 30_000 });
  });

  // Step 6: Log out and sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await profileMenu.logOut();
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
  });

  // Step 7: Traveler My Bookings shows both bookings the localite cancelled as Cancelled.
  await step('Verify both bookings are Cancelled for the traveler', async () => {
    await profileMenu.dashboardLink.click();
    await dashboardPage.sectionLink('My Bookings').click();
    await expect(page).toHaveURL(/\/dashboard\/my-bookings/);
    await expect(myBookingsPage.statusCell(ongoingBooking.date)).toHaveText(cancelled, { timeout: 30_000 });
    await expect(myBookingsPage.statusCell(pendingBooking.date)).toHaveText(cancelled);
  });
});
