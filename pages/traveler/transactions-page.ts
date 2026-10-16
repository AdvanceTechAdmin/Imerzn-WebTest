import { expect, type Locator, type Page } from '@playwright/test';
import type { CreatedBooking } from '../../utils/traveler/created-traveler';
import { toMoney } from './my-bookings-page';

/** Page Object for the traveler's Transactions page (/dashboard/transactions). */
export class TransactionsPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  /** Transaction row for a booking. Columns: Booking Id, Localite, Transaction Id, Amount, Transaction Date, Status, Actions. */
  transactionRow(bookingId: string): Locator {
    return this.main.getByRole('row').filter({ has: this.page.getByRole('cell', { name: bookingId, exact: true }) });
  }

  private cell(row: Locator, index: number): Locator {
    return row.getByRole('cell').nth(index);
  }

  /** Dialog opened by View: localite name, "Payment:$..." and "Completed". */
  get paymentViewDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /Payment:/ });
  }

  /** Verify the paid booking's transaction: localite, amount, transaction date, and status Paid. */
  async verifyTransaction(bookingId: string, booking: CreatedBooking): Promise<void> {
    if (booking.amountPaid === undefined || !booking.paidOn) {
      throw new Error('The paid booking has no recorded amount or payment date.');
    }
    const row = this.transactionRow(bookingId);
    await expect(row).toHaveCount(1, { timeout: 30_000 });
    await expect(this.cell(row, 1)).toHaveText(booking.localiteName);
    await expect(this.cell(row, 3)).toHaveText(toMoney(booking.amountPaid));
    await expect(this.cell(row, 4)).toHaveText(booking.paidOn);
    await expect(this.cell(row, 5)).toHaveText('Paid');
  }

  /** Click View and verify the payment amount and "Completed", then close the dialog. */
  async viewAndVerifyPayment(bookingId: string, booking: CreatedBooking): Promise<void> {
    await this.transactionRow(bookingId).getByRole('button', { name: 'View', exact: true }).click();
    const dialog = this.paymentViewDialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: booking.localiteName, exact: true })).toBeVisible();
    await expect(dialog).toContainText(new RegExp(`Payment:\\s*\\${toMoney(booking.amountPaid ?? 0)}`));
    await expect(dialog.getByText('Completed', { exact: true })).toBeVisible();

    await dialog.locator('button.btn-close').click();
    await expect(dialog).toBeHidden();
  }
}
