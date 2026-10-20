import { readCreatedBookings } from '@data/state/created-traveler';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';
import { toCents } from '@pages/components/price-breakdown';
import { toMoney } from '@pages/traveler/my-bookings-page';

/*
 * Booking flow step 3 of 5: the localite's view of the traveler's bookings made in step 1
 * (tests/flows/booking/01-experience-booking.spec.ts).
 */
test('LBK-001 | Localite sees the traveler bookings, transactions, earnings, and dashboard totals', { tag: ['@booking', '@localite'] }, async ({
  page, session, localite, traveler, profileMenu, dashboardPage,
  localiteBookingsPage: bookingsPage,
  localiteTransactionsPage: transactionsPage,
}) => {
  test.setTimeout(240_000);

  // Pre-setup: the bookings the traveler made (BKG-001) for the localite's experience.
  const { paid, pending } = await readCreatedBookings(traveler.email);
  const totalBookings = paid.length + pending.length;
  // Name the traveler entered in the booking form (shown to the localite).
  const travelerName = paid[0].travelerName ?? `${traveler.firstName} ${traveler.lastName}`;
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Traveler', description: `${travelerName} (${traveler.email})` },
  );

  // Step 1: Sign in as the localite.
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
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
