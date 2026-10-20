import { readCreatedBookings } from '@data/state/created-traveler';
import { readBookingData } from '@data/traveler/booking-data';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

/*
 * Booking flow step 5 of 5: cancels bookings made in step 1
 * (tests/flows/booking/01-experience-booking.spec.ts), after the traveler's cancel test (step 4).
 * It cancels the first paid (Ongoing) booking and the first pending booking;
 * step 4 cancels the last ones.
 */
test('LCN-001 | Localite cancels an Ongoing and a Pending booking; the traveler sees them Cancelled', { tag: ['@booking', '@localite'] }, async ({
  page, session, localite, traveler, profileMenu, dashboardPage, localiteBookingsPage, myBookingsPage,
}) => {
  test.setTimeout(180_000);

  // Pre-setup: the saved bookings and the cancel reason.
  const { paid, pending } = await readCreatedBookings(traveler.email);
  const { localiteCancelReason } = await readBookingData();
  const ongoingBooking = paid[0];
  const pendingBooking = pending[0];
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Cancelled Ongoing booking', description: ongoingBooking.date },
    { type: 'Cancelled Pending booking', description: pendingBooking.date },
  );

  // The site spells it "Cancelled" in tables and "Canceled" in the status filter; accept either.
  const cancelled = /^Cancell?ed$/;

  // Step 1: Sign in as the localite and open My Bookings.
  await step('Sign in as localite and open My Bookings', async () => {
    await session.signIn(localite);
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
    await session.signOut();
    await session.signIn(traveler);
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
