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

  /** Booking row by its Booking Id (first column). */
  bookingRowById(bookingId: string): Locator {
    return this.page.getByRole('main').getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: bookingId, exact: true }) });
  }

  /** Status filter above the table (All, Pending, Ongoing, Completed, Canceled, Expired). */
  get statusFilter(): Locator {
    return this.page.getByRole('main').getByRole('combobox')
      .filter({ has: this.page.getByRole('option', { name: 'Ongoing', exact: true }) });
  }

  /** Choose a status in the filter and wait until the table shows only that status (or no results). */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption({ label: status });
    const rows = this.page.getByRole('main').getByRole('row').filter({ has: this.page.getByRole('cell') });
    const noResults = this.page.getByRole('main').getByRole('heading', { name: 'No Results Found', exact: true });
    // The filter says "Canceled" while the table says "Cancelled", so compare the first 6 letters.
    const prefix = status.slice(0, 6).toLowerCase();
    await expect(async () => {
      if (await noResults.isVisible()) return;
      const statuses = await rows.locator('td:nth-child(7)').allInnerTexts();
      expect(statuses.length, 'Rows after filtering').toBeGreaterThan(0);
      expect(statuses.every((text) => text.trim().toLowerCase().startsWith(prefix)), `Every row is ${status}`).toBe(true);
    }).toPass({ timeout: 30_000 });
  }

  /** Booking Ids of the rows currently listed (after any filter). */
  async listedBookingIds(): Promise<string[]> {
    const rows = this.page.getByRole('main').getByRole('row').filter({ has: this.page.getByRole('cell') });
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    return (await rows.locator('td:nth-child(1)').allInnerTexts()).map((id) => id.trim());
  }

  /** Message shown after a booking is completed. */
  get bookingCompletedMessage(): Locator {
    return this.page.getByText('Booking Completed', { exact: false }).first();
  }

  /** Click "Complete booking" on a booking, confirm if asked, and verify "Booking Completed". */
  async completeBooking(bookingId: string): Promise<void> {
    await this.bookingRowById(bookingId).getByRole('button', { name: 'Complete booking', exact: true }).click();
    // Confirm in a dialog if the site asks (button such as "Yes" or "Complete").
    const confirmButton = this.page.locator('[role="dialog"]').locator('button', { hasText: /^(yes|complete|confirm)/i }).first();
    await expect(this.bookingCompletedMessage.or(confirmButton)).toBeVisible({ timeout: 15_000 });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await expect(this.bookingCompletedMessage).toBeVisible({ timeout: 30_000 });
  }

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
