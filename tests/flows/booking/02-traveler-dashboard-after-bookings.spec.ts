import { readCreatedBookings } from '@data/state/created-traveler';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

/* Booking flow step 2 of 5: the traveler's dashboard shows the bookings made in step 1. */
test('DSH-002 | Dashboard, My Bookings, and Transactions show the paid and pending bookings', { tag: ['@booking', '@traveler'] }, async ({
  page, session, traveler, profileMenu, dashboardPage, myBookingsPage, transactionsPage,
}) => {
  test.setTimeout(240_000);

  // Pre-setup: the bookings made by the booking test (BKG-001).
  const { paid, pending } = await readCreatedBookings(traveler.email);
  const totalBookings = paid.length + pending.length;
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    ...paid.map((b) => ({ type: 'Paid booking', description: `${b.date} ${b.startTime}, ${b.people} people` })),
    ...pending.map((b) => ({ type: 'Pending booking', description: `${b.date} ${b.startTime}, ${b.people} people` })),
  );

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await session.signIn(traveler);
    await expect(profileMenu.dashboardLink).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Dashboard shows Total Trips = number of bookings (2 paid + 2 pending = 4).
  await step(`Verify Total Trips is ${totalBookings}`, async () => {
    await profileMenu.dashboardLink.click();
    await dashboardPage.expectOnDashboard();
    await dashboardPage.verifyTotalTrips(totalBookings);
  });

  // Step 3: My Bookings: location, date, start time, duration; paid = Ongoing, unpaid = Pending Payment with Pay.
  const paidBookingIds: string[] = [];
  await step('Verify all bookings in My Bookings', async () => {
    await dashboardPage.sectionLink('My Bookings').click();
    await expect(page).toHaveURL(/\/dashboard\/my-bookings/);

    for (const booking of paid) {
      const row = await myBookingsPage.verifyBookingRow(booking, 'Ongoing');
      paidBookingIds.push(await myBookingsPage.bookingId(row));
    }
    for (const booking of pending) {
      const row = await myBookingsPage.verifyBookingRow(booking, 'Pending Payment');
      await expect(row.getByRole('button', { name: 'Pay', exact: true })).toBeVisible();
    }
    test.info().annotations.push({ type: 'Paid booking ids', description: paidBookingIds.join(', ') });
  });

  // Step 4: Ongoing booking Details show the booking; then close.
  await step('Verify the Ongoing booking Details', async () => {
    await myBookingsPage.openAndVerifyDetails(paid[0]);
    await myBookingsPage.closeDetails();
  });

  // Step 5: Transactions: localite, amount, transaction date, status Paid, for each paid booking.
  await step('Verify the transactions', async () => {
    await dashboardPage.sectionLink('Transactions').click();
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
    for (const [index, booking] of paid.entries()) {
      await transactionsPage.verifyTransaction(paidBookingIds[index], booking);
    }
  });

  // Step 6: View shows the payment and "Completed" for each paid booking; then close.
  await step('Verify the payments in View', async () => {
    for (const [index, booking] of paid.entries()) {
      await transactionsPage.viewAndVerifyPayment(paidBookingIds[index], booking);
    }
  });
});
