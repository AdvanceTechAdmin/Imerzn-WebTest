import { expect, type Locator, type Page } from '@playwright/test';
import type { CreatedBooking } from '@data/state/created-traveler';

/** Format an amount the way the site shows it, e.g. "$45.00". */
export function toMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** "09:00 AM" in the booking form is shown as "9:00 AM" in tables; match either. */
function startTimePattern(startTime: string): RegExp {
  return new RegExp(`^0?${startTime.replace(/^0/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

/** Page Object for the traveler's My Bookings page (/dashboard/my-bookings). */
export class MyBookingsPage {
  constructor(protected readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  /** Booking row for a date (MM-DD-YYYY). Columns: Booking Id, Localites, Location, Date(s), Start Time, Duration, Status. */
  bookingRow(date: string): Locator {
    return this.main.getByRole('row').filter({ has: this.page.getByRole('cell', { name: date, exact: true }) });
  }

  protected cell(row: Locator, index: number): Locator {
    return row.getByRole('cell').nth(index);
  }

  get detailsDialog(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.page.getByRole('heading', { name: 'Details' }) });
  }

  /** Value of a read-only field in the Details dialog, found by its label. */
  detailsField(label: string): Locator {
    return this.detailsDialog
      .getByText(label, { exact: true })
      .locator('xpath=following::*[self::input or self::textarea][1]');
  }

  /** Verify a booking row's localite, location, date, start time, duration, and status. */
  async verifyBookingRow(booking: CreatedBooking, status: string): Promise<Locator> {
    const row = this.bookingRow(booking.date);
    await expect(row).toHaveCount(1, { timeout: 30_000 });
    await expect(this.cell(row, 1)).toHaveText(booking.localiteName);
    await expect(this.cell(row, 2)).toHaveText(booking.location);
    await expect(this.cell(row, 3)).toHaveText(booking.date);
    await expect(this.cell(row, 4)).toHaveText(startTimePattern(booking.startTime));
    await expect(this.cell(row, 5)).toHaveText(`${booking.durationHours} hours`);
    await expect(this.cell(row, 6)).toHaveText(status);
    return row;
  }

  /** Booking Id shown in the first column of a row. */
  async bookingId(row: Locator): Promise<string> {
    return (await this.cell(row, 0).innerText()).trim();
  }

  /**
   * Click a booking row and verify the Details dialog shows the booking.
   * "Name" is the other party: the localite for travelers, the traveler for localites.
   */
  async openAndVerifyDetails(booking: CreatedBooking, name: string = booking.localiteName): Promise<void> {
    await this.cell(this.bookingRow(booking.date), 2).click();
    await expect(this.detailsDialog).toBeVisible();

    const expected: Array<[string, string]> = [
      ['Experience', booking.experienceTitle],
      ['Name', name],
      ['Location', booking.location],
      ['No of people', String(booking.people)],
      ['Duration (hours)', String(booking.durationHours)],
      ['Date(s)', booking.date],
      ['Price per person', toMoney(booking.pricePerPerson)],
      ['Notes', booking.notes],
    ];
    for (const [label, value] of expected) {
      await expect(this.detailsField(label), `Details: ${label}`).toHaveValue(value);
    }
  }

  /** Status cell of the booking on a date. */
  statusCell(date: string): Locator {
    return this.cell(this.bookingRow(date), 6);
  }

  /** Name of the cancel icon, dialog title, and confirm button: "Cancel Trip" for travelers. */
  protected readonly cancelLabel: string = 'Cancel Trip';

  /** Cancel (trash) icon in a booking row. */
  cancelButton(date: string): Locator {
    return this.bookingRow(date).getByRole('button', { name: this.cancelLabel });
  }

  /**
   * Cancel confirmation dialog. The site sometimes marks it aria-hidden, which hides it
   * from role-based locators, so it and its parts are found by CSS and text.
   */
  get cancelDialog(): Locator {
    return this.page.locator('[role="dialog"]').filter({
      hasText: 'Are you sure you want to cancel your request for this trip?',
    });
  }

  /** Click the cancel icon of a booking and verify the confirmation dialog opens with its title. */
  async openCancelDialog(date: string): Promise<void> {
    await this.cancelButton(date).click();
    await expect(this.cancelDialog).toBeVisible();
    await expect(this.cancelDialog.getByText(this.cancelLabel, { exact: true }).first()).toBeVisible();
  }

  /** Close the cancel dialog with "Not Now" (the booking is not cancelled). */
  async dismissCancel(): Promise<void> {
    await this.cancelDialog.getByText('Not Now', { exact: true }).click();
    await expect(this.cancelDialog).toBeHidden();
  }

  /** Enter a reason and confirm with the red cancel button. */
  async confirmCancel(reason: string): Promise<void> {
    await this.cancelDialog.locator('textarea[name="description"]').fill(reason);
    await this.cancelDialog.locator('button', { hasText: this.cancelLabel }).click();
    await expect(this.cancelDialog).toBeHidden({ timeout: 30_000 });
  }

  async closeDetails(): Promise<void> {
    await this.detailsDialog.getByRole('button', { name: 'Close' }).click();
    await expect(this.detailsDialog).toBeHidden();
  }
}
