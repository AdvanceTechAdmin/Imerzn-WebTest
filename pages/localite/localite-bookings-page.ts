import { expect, type Locator } from '@playwright/test';
import type { CreatedBooking } from '../../utils/traveler/created-traveler';
import { MyBookingsPage } from '../traveler/my-bookings-page';

/**
 * Page Object for the localite's My Bookings page (/dashboard/booking).
 * Same table and Details dialog as the traveler's, but the columns are
 * Booking Id, User Name (the traveler), Location, Date(s), Start Time, Duration, Status, Actions
 * (Chat on Ongoing bookings, Cancel Booking on all open ones).
 */
export class LocaliteBookingsPage extends MyBookingsPage {
  /** The localite's cancel icon, dialog title, and confirm button say "Cancel Booking". */
  protected override readonly cancelLabel: string = 'Cancel Booking';

  /** Verify a booking row's traveler name, location, date, start time, duration, and status. */
  async verifyLocaliteBookingRow(booking: CreatedBooking, travelerName: string, status: string): Promise<Locator> {
    const row = this.bookingRow(booking.date);
    await expect(row).toHaveCount(1, { timeout: 30_000 });
    await expect(this.cell(row, 1)).toHaveText(travelerName);
    await expect(this.cell(row, 2)).toHaveText(booking.location);
    await expect(this.cell(row, 3)).toHaveText(booking.date);
    await expect(this.cell(row, 4)).toHaveText(new RegExp(`^0?${booking.startTime.replace(/^0/, '')}$`));
    await expect(this.cell(row, 5)).toHaveText(`${booking.durationHours} hours`);
    await expect(this.cell(row, 6)).toHaveText(status);
    return row;
  }
}
