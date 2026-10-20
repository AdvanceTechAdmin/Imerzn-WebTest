import { expect, type Locator, type Page } from '@playwright/test';
import { toCents } from '../components/price-breakdown';
import type { CreatedBooking } from '@data/state/created-traveler';
import { toMoney } from '../traveler/my-bookings-page';

/** Values in the localite's transaction View dialog. */
export interface LocaliteEarnings {
  commissionPercent: number;
  commission: number;
  localiteEarnings: number;
}

/** All values in the transaction View dialog. */
export interface TransactionView extends LocaliteEarnings {
  travelerName: string;
  people: number;
  amount: number;
  credits: number;
  subTotal: number;
  salesTaxAndPlatformFee: number;
  total: number;
}

/** Page Object for the localite's Transactions page (/dashboard/transactions). */
export class LocaliteTransactionsPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  /** Row for a booking. Columns: Name (traveler), Transaction Id, Date, Transaction Amount, Booking Id, Status, Action. */
  transactionRow(bookingId: string): Locator {
    return this.main.getByRole('row').filter({ has: this.page.getByRole('cell', { name: bookingId, exact: true }) });
  }

  private cell(row: Locator, index: number): Locator {
    return row.getByRole('cell').nth(index);
  }

  /** Dialog opened by View, with the amount breakdown, commission, and localite earnings. */
  get viewDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Localite Earnings' });
  }

  /** Booking Ids of all transactions, most recent first. */
  async bookingIds(): Promise<string[]> {
    const rows = this.main.getByRole('row').filter({ has: this.page.getByRole('button', { name: 'View', exact: true }) });
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    return (await rows.locator('td:nth-child(5)').allInnerTexts()).map((id) => id.trim());
  }

  /** Click View on a booking's transaction and read every value in the dialog (left open). */
  async openView(bookingId: string): Promise<TransactionView> {
    await this.transactionRow(bookingId).getByRole('button', { name: 'View', exact: true }).click();
    const dialog = this.viewDialog;
    await expect(dialog).toBeVisible();

    const text = (await dialog.innerText()).replace(/\s+/g, ' ');
    const money = (pattern: RegExp, label: string): number => {
      const match = text.match(pattern);
      if (!match) {
        throw new Error(`Could not find "${label}" in the View dialog: ${text}`);
      }
      return Number(match[match.length - 1].replace(/,/g, ''));
    };
    return {
      travelerName: (await dialog.getByRole('heading').first().innerText()).trim(),
      people: money(/Amount \(x (\d+) (?:people|person)\)/, 'people'),
      amount: money(/Amount \(x \d+ (?:people|person)\) \$([\d,.]+)/, 'Amount'),
      // A booking without a promo code may have no Credits row; then the credit is $0.
      credits: /Credits \$/.test(text) ? money(/Credits \$([\d,.]+)/, 'Credits') : 0,
      subTotal: money(/Sub Total \$([\d,.]+)/, 'Sub Total'),
      salesTaxAndPlatformFee: money(/Sales Tax \+ Platform Fee \$([\d,.]+)/, 'Sales Tax + Platform Fee'),
      // "Total" on its own, not the "Sub Total" row.
      total: money(/(?<!Sub )Total \$([\d,.]+)/, 'Total'),
      commissionPercent: money(/Commission \(([\d.]+)%\)/, 'Commission %'),
      commission: money(/Commission \([\d.]+%\) \$([\d,.]+)/, 'Commission'),
      localiteEarnings: money(/Localite Earnings[^$]*\$([\d,.]+)/, 'Localite Earnings'),
    };
  }

  /** Verify the dialog's sums: Sub Total, Total, Commission = % x Sub Total, Earnings = Sub Total - Commission. */
  verifyViewTotals(view: TransactionView): void {
    expect(view.subTotal, 'Sub Total = Amount - Credits').toBe(toCents(view.amount - view.credits));
    expect(view.total, 'Total = Sub Total + Sales Tax + Platform Fee').toBe(toCents(view.subTotal + view.salesTaxAndPlatformFee));
    expect(view.commission, 'Commission = % x Sub Total').toBe(toCents((view.commissionPercent / 100) * view.subTotal));
    expect(view.localiteEarnings, 'Localite Earnings = Sub Total - Commission').toBe(toCents(view.subTotal - view.commission));
  }

  async closeView(): Promise<void> {
    await this.viewDialog.locator('button.btn-close').click();
    await expect(this.viewDialog).toBeHidden();
  }

  /** Verify the paid booking's transaction: traveler name, amount, date, and status Paid. */
  async verifyTransaction(bookingId: string, booking: CreatedBooking, travelerName: string): Promise<void> {
    if (booking.amountPaid === undefined || !booking.paidOn) {
      throw new Error('The paid booking has no recorded amount or payment date.');
    }
    const row = this.transactionRow(bookingId);
    await expect(row).toHaveCount(1, { timeout: 30_000 });
    await expect(this.cell(row, 0)).toHaveText(travelerName);
    await expect(this.cell(row, 2)).toHaveText(booking.paidOn);
    await expect(this.cell(row, 3)).toHaveText(toMoney(booking.amountPaid));
    await expect(this.cell(row, 5)).toHaveText('Paid');
  }

  /**
   * Click View and verify the breakdown matches what the traveler booked, then
   * Commission = % x Sub Total and Localite Earnings = Sub Total - Commission. Closes the dialog.
   */
  async viewAndVerifyEarnings(bookingId: string, booking: CreatedBooking, travelerName: string): Promise<LocaliteEarnings> {
    const prices = booking.prices;
    if (!prices) {
      throw new Error('The paid booking has no recorded price breakdown. Re-run the booking test.');
    }

    const view = await this.openView(bookingId);
    await expect(this.viewDialog.getByRole('heading', { name: travelerName, exact: true })).toBeVisible();

    // Values entered on the traveler side.
    expect(view.people, 'People').toBe(booking.people);
    expect(view.amount, 'Amount').toBe(prices.amount);
    expect(view.credits, 'Credits').toBe(prices.credit);
    expect(view.subTotal, 'Sub Total').toBe(prices.subTotal);
    expect(view.salesTaxAndPlatformFee, 'Sales Tax + Platform Fee').toBe(toCents(prices.salesTax + prices.platformFee));
    expect(view.total, 'Total').toBe(prices.totalAmountDue);

    // Commission and earnings.
    expect(view.commission, 'Commission = % x Sub Total').toBe(toCents((view.commissionPercent / 100) * prices.subTotal));
    expect(view.localiteEarnings, 'Localite Earnings = Sub Total - Commission').toBe(toCents(prices.subTotal - view.commission));

    await this.closeView();
    const { commissionPercent, commission, localiteEarnings } = view;
    return { commissionPercent, commission, localiteEarnings };
  }
}
