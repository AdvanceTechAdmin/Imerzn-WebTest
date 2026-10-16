import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { toCents } from '../../pages/components/price-breakdown';
import { LocaliteBookingsPage } from '../../pages/localite/localite-bookings-page';
import { LocaliteTransactionsPage } from '../../pages/localite/localite-transactions-page';
import { DashboardPage } from '../../pages/traveler/dashboard-page';
import { toMoney } from '../../pages/traveler/my-bookings-page';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getLocaliteAccount } from '../../utils/localite/created-localite';
import { getTravelerAccount, readCreatedBookings } from '../../utils/traveler/created-traveler';

/*
 * Localite view of the traveler's bookings. Needs the bookings made by
 * tests/traveler/experience-booking.spec.ts, so it must run after that test.
 */
test('LBK-001 | Localite sees the traveler bookings, transactions, earnings, and dashboard totals', async ({ page }) => {
  test.setTimeout(240_000);

  // Pre-setup: localite who owns the experience, and the bookings the traveler made (BKG-001).
  const localite = await getLocaliteAccount();
  const traveler = await getTravelerAccount();
  const { paid, pending } = await readCreatedBookings(traveler.email);
  const totalBookings = paid.length + pending.length;
  // Name the traveler entered in the booking form (shown to the localite).
  const travelerName = paid[0].travelerName ?? `${traveler.firstName} ${traveler.lastName}`;
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Traveler', description: `${travelerName} (${traveler.email})` },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const dashboardPage = new DashboardPage(page);
  const bookingsPage = new LocaliteBookingsPage(page);
  const transactionsPage = new LocaliteTransactionsPage(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the localite.
  await step('Sign in as localite', async () => {
    await loginPage.open();
    await loginPage.login(localite.email, localite.password);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: My Bookings: location, date, start time, duration; paid = Ongoing, unpaid = Pending.
  const paidBookingIds: string[] = [];
  await step('Verify all bookings in My Bookings', async () => {
    await profileMenu.dashboardLink.click();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await dashboardPage.sectionLink('My Bookings').click();
    await expect(page).toHaveURL(/\/dashboard\/booking/);

    // The paid booking is Ongoing and has a Chat button to message the traveler  and a Cancel Booking icon.
    for (const booking of paid) {
      const row = await bookingsPage.verifyLocaliteBookingRow(booking, travelerName, 'Ongoing');
      await expect(row.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Cancel Booking', exact: true })).toBeVisible();
      paidBookingIds.push(await bookingsPage.bookingId(row));
    }

    // The unpaid booking shows "Pending" to the localite  and a Cancel Booking icon.
    for (const booking of pending) {
      const row = await bookingsPage.verifyLocaliteBookingRow(booking, travelerName, 'Pending');
      await expect(row.getByRole('button', { name: 'Cancel Booking', exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Pay', exact: true })).toHaveCount(0);
      await expect(row.getByRole('button', { name: 'Chat', exact: true })).toHaveCount(0);
    }
    test.info().annotations.push({ type: 'Paid booking ids', description: paidBookingIds.join(', ') });
  });

  // Step 3: Ongoing booking Details (Name = the traveler); then close.
  await step('Verify the Ongoing booking Details', async () => {
    await bookingsPage.openAndVerifyDetails(paid[0], travelerName);
    await bookingsPage.closeDetails();
  });

  // Step 4: Transactions: traveler name, amount, date, status Paid, for each paid booking.
  await step('Verify the transactions', async () => {
    await dashboardPage.sectionLink('Transactions').click();
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
    for (const [index, booking] of paid.entries()) {
      await transactionsPage.verifyTransaction(paidBookingIds[index], booking, travelerName);
    }
  });

  // Step 5: View (each paid booking): breakdown matches the traveler side, Commission = % x Sub Total,
  // Localite Earnings = Sub Total - Commission; then close.
  let totalEarnings = 0;
  await step('Verify the earnings in View', async () => {
    for (const [index, booking] of paid.entries()) {
      const earnings = await transactionsPage.viewAndVerifyEarnings(paidBookingIds[index], booking, travelerName);
      totalEarnings = toCents(totalEarnings + earnings.localiteEarnings);
      test.info().annotations.push({
        type: 'Earnings',
        description: `${booking.date}: Commission ${earnings.commissionPercent}% = ${toMoney(earnings.commission)}, ` +
          `Localite Earnings = ${toMoney(earnings.localiteEarnings)}`,
      });
    }
  });

  // Step 6: Dashboard: Wallet = sum of Localite Earnings, Bookings = number of bookings, Travelers = 1.
  await step('Verify Wallet, Bookings, and Travelers on the Dashboard', async () => {
    await dashboardPage.sectionLink('Dashboard').click();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await dashboardPage.verifyStat('Wallet', toMoney(totalEarnings));
    await dashboardPage.verifyStat('Bookings', String(totalBookings));
    await dashboardPage.verifyStat('Travelers', '1');
  });
});
