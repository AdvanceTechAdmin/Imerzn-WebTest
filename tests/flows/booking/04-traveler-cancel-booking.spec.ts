import { readCreatedBookings } from '@data/state/created-traveler';
import { readBookingData } from '@data/traveler/booking-data';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

/*
 * Booking flow step 4 of 5: cancels bookings made in step 1
 * (tests/flows/booking/01-experience-booking.spec.ts), after both dashboards have checked them.
 * It cancels the second paid (Ongoing) booking and the second pending booking.
 */
test('CNL-001 | Traveler cancels an Ongoing and a Pending booking; the localite sees them Cancelled', { tag: ['@booking', '@traveler'] }, async ({
  page, session, traveler, localite, profileMenu, dashboardPage, myBookingsPage, localiteBookingsPage,
}) => {
  test.setTimeout(180_000);

  // Pre-setup: the saved bookings and the cancel reason.
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

  // Step 1: Sign in as the traveler and open My Bookings.
  await step('Sign in as traveler and open My Bookings', async () => {
    await session.signIn(traveler);
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
    await session.signOut();
    await session.signIn(localite);
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
