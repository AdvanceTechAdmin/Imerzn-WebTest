import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { ProfileMenu } from '../../pages/components/profile-menu';
import { toCents } from '../../pages/components/price-breakdown';
import { FindTouristGuidePage } from '../../pages/localite/find-tourist-guide-page';
import { BookExperienceDialog } from '../../pages/traveler/book-experience-dialog';
import { ExperienceDetailsPage } from '../../pages/traveler/experience-details-page';
import { PaymentDialog } from '../../pages/traveler/payment-dialog';
import { autoCloseNewsletterPopup, step } from '../../utils/common/common';
import { getLocaliteAccount, readCreatedContent } from '../../utils/localite/created-localite';
import { readExperienceData } from '../../utils/localite/experience-data';
import { readBookingData, toSiteDate } from '../../utils/traveler/booking-data';
import {
  getTravelerAccount,
  saveCreatedBooking,
  type CreatedBooking,
} from '../../utils/traveler/created-traveler';

test('BKG-001 | Traveler books the created experience: 2 paid (one with a promo code) and 2 pending', async ({ page }) => {
  test.setTimeout(420_000);

  // Pre-setup: traveler from AUTH-003, latest experience, and booking data from booking.csv.
  const traveler = await getTravelerAccount();
  const localite = await getLocaliteAccount();
  const { experienceTitle } = await readCreatedContent(localite.email);
  if (!experienceTitle) {
    throw new Error(
      `No created experience recorded for ${localite.email}. ` +
      'Run Create Experience first (testdata/localite/created-content.json).',
    );
  }
  const booking = await readBookingData();
  // Duration of the experience made by Create Experience (create-experience.csv).
  const durationHours = Number((await readExperienceData()).duration);
  test.info().annotations.push(
    { type: 'Traveler email', description: traveler.email },
    { type: 'Experience', description: experienceTitle },
    { type: 'Booking date', description: booking.date.toDateString() },
  );

  const loginPage = new LoginPage(page);
  const profileMenu = new ProfileMenu(page);
  const experiencesPage = new FindTouristGuidePage(page);
  const detailsPage = new ExperienceDetailsPage(page);
  const bookingDialog = new BookExperienceDialog(page);
  const paymentDialog = new PaymentDialog(page);

  await autoCloseNewsletterPopup(page);

  // Step 1: Sign in as the traveler.
  await step('Sign in as traveler', async () => {
    await loginPage.open();
    await loginPage.login(traveler.email, traveler.password);
    await expect(profileMenu.profileImage).toBeVisible({ timeout: 60_000 });
  });

  // Step 2: Experiences > search the experience > open it.
  await step('Search and open the experience', async () => {
    await experiencesPage.openExperiences();
    await experiencesPage.searchExperience(experienceTitle);
    await experiencesPage.openExperience(experienceTitle);
    await detailsPage.expectOpened(experienceTitle);
  });

  // Details of each booking, saved at the end for the My Bookings / Transactions test.
  let paidBooking: CreatedBooking | undefined;

  // Step 3: Book Experience: date (today + 1), start time, group size, note.
  await step('Fill in the booking form', async () => {
    await detailsPage.bookExperienceButton.click();
    await bookingDialog.expectOpen();
    await bookingDialog.selectDate(booking.date);
    const startTime = await bookingDialog.selectFirstStartTime();
    test.info().annotations.push({ type: 'Start time', description: startTime });
    await bookingDialog.fillGroupSizeAndNote(booking.groupSize, booking.note);

    const { localiteName, travelerName, location } = await bookingDialog.readFixedDetails();
    const prices = await bookingDialog.readPrices();
    paidBooking = {
      experienceTitle, localiteName, travelerName, location,
      date: toSiteDate(booking.date), startTime, durationHours,
      people: booking.groupSize, pricePerPerson: toCents(prices.amount / prices.people), notes: booking.note,
    };
  });

  // Step 4: Platform Fee = (%) x Sub Total, and Total Amount Due = Sub Total + Sales Tax + Platform Fee.
  await step('Verify Platform Fee and Total Amount Due', async () => {
    const prices = await bookingDialog.readPrices();
    expect(prices.people).toBe(booking.groupSize);
    expect(prices.platformFee, 'Platform Fee = (%) x Sub Total')
      .toBe(toCents((prices.platformFeePercent / 100) * prices.subTotal));
    expect(prices.totalAmountDue, 'Total Amount Due = Sub Total + Sales Tax + Platform Fee')
      .toBe(toCents(prices.subTotal + prices.salesTax + prices.platformFee));
  });

  // Step 5: Apply the promo code; Credit = credit per person x Group Size, Sub Total = Amount - Credit.
  await step('Apply promo code and verify Credit and Sub Total', async () => {
    await bookingDialog.applyPromoCode(booking.promoCode);
    const prices = await bookingDialog.readPrices();
    expect(prices.credit, `Credit = ${booking.creditPerPerson} x Group Size`)
      .toBe(toCents(booking.creditPerPerson * booking.groupSize));
    expect(prices.subTotal, 'Sub Total = Amount - Credit').toBe(toCents(prices.amount - prices.credit));
    expect(prices.platformFee, 'Platform Fee = (%) x Sub Total (after promo)')
      .toBe(toCents((prices.platformFeePercent / 100) * prices.subTotal));
    expect(prices.totalAmountDue, 'Total Amount Due = Sub Total + Sales Tax + Platform Fee (after promo)')
      .toBe(toCents(prices.subTotal + prices.salesTax + prices.platformFee));

    if (paidBooking) {
      const { amount, credit, subTotal, salesTax, platformFee, totalAmountDue } = prices;
      paidBooking.prices = { amount, credit, subTotal, salesTax, platformFee, totalAmountDue };
    }
  });

  // Step 6: Book, then check the Payment dialog total.
  await step('Book and verify the Payment dialog total', async () => {
    await bookingDialog.book();
    await paymentDialog.expectOpen();
    const prices = await paymentDialog.readPrices();
    if (paidBooking) {
      paidBooking.amountPaid = prices.totalAmountDue;
    }
    // Soft check: reported as a failure if wrong, but payment still continues.
    expect.soft(prices.totalAmountDue, 'Payment dialog: Total Amount Due = Sub Total + Sales Tax + Platform Fee')
      .toBe(toCents(prices.subTotal + prices.salesTax + prices.platformFee));
  });

  // Step 7: Card and billing address, then Pay.
  await step('Pay with card', async () => {
    await paymentDialog.fillCard(booking.card);
    await paymentDialog.fillBilling(booking.billing);
    await paymentDialog.payAndVerify();
  });

  // Record the paid booking for the My Bookings / Transactions test.
  if (paidBooking) {
    await saveCreatedBooking(traveler.email, 'paid', { ...paidBooking, paidOn: toSiteDate(new Date()) });
  }

  /**
   * Book the experience again: search and open it, fill in the form, then either pay
   * (card + billing, no promo code, no price checks) or close Payment so it stays pending.
   * Records the booking for the My Bookings / Transactions tests.
   */
  const bookAgain = async (
    label: string,
    details: { date: Date; groupSize: number; note: string },
    pay: boolean,
  ): Promise<void> => {
    await step(`${label}: search and open the experience`, async () => {
      await experiencesPage.openExperiences();
      await experiencesPage.searchExperience(experienceTitle);
      await experiencesPage.openExperience(experienceTitle);
      await detailsPage.expectOpened(experienceTitle);
    });

    let record: CreatedBooking | undefined;
    await step(`${label}: fill in the booking form`, async () => {
      await detailsPage.bookExperienceButton.click();
      await bookingDialog.expectOpen();
      await bookingDialog.selectDate(details.date);
      const startTime = await bookingDialog.selectFirstStartTime();
      await bookingDialog.fillGroupSizeAndNote(details.groupSize, details.note);

      const { localiteName, travelerName, location } = await bookingDialog.readFixedDetails();
      const prices = await bookingDialog.readPrices();
      const { amount, credit, subTotal, salesTax, platformFee, totalAmountDue } = prices;
      record = {
        experienceTitle, localiteName, travelerName, location,
        date: toSiteDate(details.date), startTime, durationHours,
        people: details.groupSize, pricePerPerson: toCents(amount / prices.people),
        notes: details.note,
        ...(pay ? { prices: { amount, credit, subTotal, salesTax, platformFee, totalAmountDue } } : {}),
      };
    });

    if (pay) {
      await step(`${label}: book and pay`, async () => {
        await bookingDialog.bookAndVerifyCreated();
        await paymentDialog.expectOpen();
        const prices = await paymentDialog.readPrices();
        await paymentDialog.fillCard(booking.card);
        await paymentDialog.fillBilling(booking.billing);
        await paymentDialog.payAndVerify();
        if (record) {
          record.amountPaid = prices.totalAmountDue;
          record.paidOn = toSiteDate(new Date());
        }
      });
    } else {
      await step(`${label}: book without paying`, async () => {
        await bookingDialog.bookAndVerifyCreated();
        await paymentDialog.expectOpen();
        await paymentDialog.cancel();
      });
    }

    if (record) {
      await saveCreatedBooking(traveler.email, pay ? 'paid' : 'pending', record);
    }
  };

  // Steps 8-10: pending booking (today + 2): book, then close Payment without paying.
  await bookAgain('Pending booking', booking.pending, false);

  // Steps 11-13: second paid booking (today + 3): no promo code, pay with card.
  await bookAgain('Paid booking 2', booking.paid2, true);

  // Steps 14-16: second pending booking (today + 4): book, then close Payment without paying.
  await bookAgain('Pending booking 2', booking.pending2, false);
});
