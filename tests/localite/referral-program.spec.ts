import { readReferralProgramData } from '@data/localite/referral-program-data';
import { readBookingData, toSiteDate } from '@data/traveler/booking-data';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';
import { toCents } from '@pages/components/price-breakdown';
import type { TransactionView } from '@pages/localite/localite-transactions-page';
import { toAmount, type ReferralHistoryRow } from '@pages/localite/referral-page';
import { toMoney } from '@pages/traveler/my-bookings-page';

/*
 * Uses the fixed referral-program accounts in testdata/localite/Referral-program.csv:
 * the referrer, the referee who signed up with the referrer's code, and the traveler.
 * The referee completes an Ongoing, paid booking, the referrer withdraws the referral earnings,
 * and at the end the traveler books and pays again, which the next run completes.
 * Runs in CI too (dev environment): it changes that data and makes a real (test) payment.
 * It logs in through the login form (not session.signIn) because it switches between three
 * fixed accounts that share one password.
 */
test('REF-001 | Referral program: referrer earns Referral % of the commission and withdraws it', { tag: ['@localite', '@payment'] }, async ({
  page, loginPage, profileMenu, dashboardPage, referralPage, bookingDialog, paymentDialog,
  experiencesPage: findTouristGuidePage,
  localiteTransactionsPage: transactionsPage,
  localiteBookingsPage: bookingsPage,
  experienceDetailsPage: detailsPage,
}) => {
  test.setTimeout(300_000);

  // Pre-setup: the referral accounts, and the card and billing address used by the booking tests.
  const referral = await readReferralProgramData();
  const { card, billing } = await readBookingData();
  const referee = referral.referees[0];
  const refereeName = `${referee.firstName} ${referee.lastName}`;
  const travelerName = `${referral.traveler.firstName} ${referral.traveler.lastName}`;

  // Log in as one of the referral accounts through the login form.
  const logIn = async (email: string): Promise<void> => {
    await loginPage.open();
    await loginPage.login(email, referral.password);
    // Continue as soon as the redirect away from /login starts ('commit'), without waiting for the
    // next page to load: the home page can stay slow for a long time after login. Clicking before
    // the redirect would leave the login page before the login completes.
    await page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 60_000, waitUntil: 'commit' });
  };
  // After login the referrer may land on a page with the dashboard header (no profile image),
  // so go to Experiences first, then profile image > Referral.
  const openReferralAsReferrer = async (): Promise<void> => {
    await logIn(referral.referrerEmail);
    await findTouristGuidePage.openExperiences();
    await profileMenu.openReferral();
    await referralPage.expectLoaded(referral.referralCode);
  };
  // Print a Referral History row and add it to the report.
  const report = (label: string, row: ReferralHistoryRow): void => {
    const values = `Referral % ${row.referralPercent}, Total Earned ${row.totalEarned}, Withdrawable ${row.withdrawable}, Status ${row.status}`;
    console.log(`${label}: ${values}`);
    test.info().annotations.push({ type: label, description: values });
  };

  // Step 1: Referrer opens Referral from the profile menu and records the Referral History row.
  let before: ReferralHistoryRow | undefined;
  await step('Referrer: check Referral History', async () => {
    await openReferralAsReferrer();
    before = await referralPage.readHistoryRow(refereeName);
    expect(before.referralPercent, 'Referral %').toBe(referral.referralPercent);
    expect(before.status, 'Status').toBe(referral.referralStatus);
    expect(before.totalEarned, 'Total Earned').toMatch(/^\$[\d,]+\.\d{2}$/);
    expect(before.withdrawable, 'Withdrawable').toMatch(/^\$[\d,]+\.\d{2}$/);
    report('Referral History before', before);
  });

  // Step 2: Referee opens View on the most recent transaction whose booking is still Ongoing
  // (earlier runs completed others), and records Commission and Localite Earnings.
  let bookingId = '';
  let view: TransactionView | undefined;
  await step('Referee: check a transaction in My Transactions', async () => {
    await profileMenu.logOut();
    await logIn(referee.email);
    await profileMenu.dashboardLink.click();

    await dashboardPage.sectionLink('My Bookings').click();
    await bookingsPage.filterByStatus('Ongoing');
    const ongoingIds = await bookingsPage.listedBookingIds();

    await dashboardPage.sectionLink('Transactions').click();
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
    const paidIds = await transactionsPage.bookingIds();
    const found = paidIds.find((id) => ongoingIds.includes(id));
    if (!found) {
      throw new Error(`No paid booking is still Ongoing (Ongoing: ${ongoingIds.join(', ') || 'none'}). ` +
        `The last steps of this test book and pay for "${referral.experience.title}" as ${travelerName}; ` +
        'if the previous run stopped before them, book and pay once by hand.');
    }
    bookingId = found;
    view = await transactionsPage.openView(bookingId);
    expect(view.travelerName, 'Traveler').toBe(travelerName);
    expect(view.amount, 'Amount = people x experience price').toBe(view.people * Number(referral.experience.price));
    transactionsPage.verifyViewTotals(view);
    await transactionsPage.closeView();

    const values = `Booking ${bookingId}: Commission (${view.commissionPercent}%) ${toMoney(view.commission)}, Localite Earnings ${toMoney(view.localiteEarnings)}`;
    console.log(values);
    test.info().annotations.push({ type: 'Transaction', description: values });
  });

  // Step 3: My Bookings filtered by Ongoing; complete that booking.
  await step(`Referee: complete booking ${bookingId}`, async () => {
    await dashboardPage.sectionLink('My Bookings').click();
    await expect(page).toHaveURL(/\/dashboard\/booking/);
    await bookingsPage.filterByStatus('Ongoing');
    await expect(bookingsPage.bookingRowById(bookingId), `Booking ${bookingId} is listed as Ongoing`).toHaveCount(1, { timeout: 30_000 });
    await bookingsPage.completeBooking(bookingId);
  });

  // Step 4: Referrer earns Referral % of the completed booking's commission.
  let withdrawable = 0;
  await step('Referrer: verify the new Withdrawable and Total Earned', async () => {
    if (!before || !view) throw new Error('Earlier steps did not record their values.');
    await profileMenu.logOut();
    await openReferralAsReferrer();

    const earned = toCents((toAmount(before.referralPercent.replace('%', '')) / 100) * view.commission);
    const after = await referralPage.readHistoryRow(refereeName);
    report('Referral History after', after);
    withdrawable = toAmount(after.withdrawable);
    expect(withdrawable, `Withdrawable = ${before.withdrawable} + ${before.referralPercent} x ${toMoney(view.commission)}`)
      .toBe(toCents(toAmount(before.withdrawable) + earned));
    expect(toAmount(after.totalEarned), `Total Earned = ${before.totalEarned} + ${toMoney(earned)}`)
      .toBe(toCents(toAmount(before.totalEarned) + earned));
  });

  // Step 5: Withdraw everything. If a withdrawal request is already pending, the site refuses it and
  // nothing changes; otherwise Withdrawable becomes $0.00 and the Withdraw button disappears.
  await step('Referrer: withdraw the earnings', async () => {
    const { amount, alreadyPending } = await referralPage.withdraw(refereeName, withdrawable);
    const withdrawableCell = referralPage.historyRow(refereeName).getByRole('cell').nth(3);

    // Soft checks: a failure marks the test failed, but the booking steps below still run,
    // so the next run has a booking to complete. The page must update without a reload.
    if (alreadyPending) {
      test.info().annotations.push({ type: 'Withdraw', description: `Refused: a withdrawal request is already pending (${toMoney(amount)} not withdrawn)` });
      await expect.soft.poll(async () => (await referralPage.readHistoryRow(refereeName)).withdrawable,
        `Withdrawable stays ${toMoney(withdrawable)} (request already pending)`).toBe(toMoney(withdrawable));
      await expect.soft(referralPage.withdrawButton(refereeName), 'Withdraw button stays (request already pending)')
        .toBeVisible();
    } else {
      test.info().annotations.push({ type: 'Withdrawn', description: toMoney(amount) });
      await expect.soft(withdrawableCell, 'Withdrawable is $0.00 after Submit')
        .toHaveText(/^\s*\$0\.00\s*$/, { timeout: 10_000 });
      await expect.soft(referralPage.withdrawButton(refereeName), 'Withdraw button disappears after Submit')
        .toHaveCount(0, { timeout: 10_000 });
    }
    report('Referral History after withdraw', await referralPage.readHistoryRow(refereeName));
  });

  // Step 6: Traveler finds the referee's experience (this booking is completed by the next run).
  await step(`Traveler: search "${referral.experience.title}"`, async () => {
    await profileMenu.logOut();
    await logIn(referral.traveler.email);
    await findTouristGuidePage.openExperiences();
    await findTouristGuidePage.searchExperience(referral.experience.title);
    await findTouristGuidePage.openExperience(referral.experience.title);
    await detailsPage.expectOpened(referral.experience.title);
  });

  // Step 7: Book for today; if today has no start time left, book tomorrow.
  await step('Traveler: book the experience', async () => {
    await detailsPage.bookExperienceButton.click();
    await bookingDialog.expectOpen();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let date = today;
    await bookingDialog.selectDate(date);
    if (!(await bookingDialog.hasStartTimes())) {
      date = new Date(today);
      date.setDate(today.getDate() + 1);
      await bookingDialog.selectDate(date);
    }
    const startTime = await bookingDialog.selectFirstStartTime();
    await bookingDialog.fillGroupSizeAndNote(referral.booking.groupSize, referral.booking.note);
    test.info().annotations.push({ type: 'Booked', description: `${toSiteDate(date)} ${startTime}, ${referral.booking.groupSize} people` });
    await bookingDialog.bookAndVerifyCreated();
  });

  // Step 8: Pay for the booking.
  await step('Traveler: pay for the booking', async () => {
    await paymentDialog.expectOpen();
    await paymentDialog.fillCard(card);
    await paymentDialog.fillBilling(billing);
    await paymentDialog.payAndVerify();
  });
});
