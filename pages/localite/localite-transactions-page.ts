import { expect, type Locator, type Page } from '@playwright/test';
import { toCents } from '../components/price-breakdown';
import type { CreatedBooking } from '../../utils/traveler/created-traveler';
import { toMoney } from '../traveler/my-bookings-page';

/** Values in the localite's transaction View dialog. */
export interface LocaliteEarnings {
  commissionPercent: number;
  commission: number;
  localiteEarnings: number;
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

    await this.transactionRow(bookingId).getByRole('button', { name: 'View', exact: true }).click();
    const dialog = this.viewDialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: travelerName, exact: true })).toBeVisible();

    const text = (await dialog.innerText()).replace(/\s+/g, ' ');
    const money = (pattern: RegExp, label: string): number => {
      const match = text.match(pattern);
      if (!match) {
        throw new Error(`Could not find "${label}" in the View dialog: ${text}`);
      }
      return Number(match[match.length - 1].replace(/,/g, ''));
    };

    // Values entered on the traveler side.
    expect(money(/Amount \(x (\d+) (?:people|person)\)/, 'people'), 'People').toBe(booking.people);
    expect(money(/Amount \(x \d+ (?:people|person)\) \$([\d,.]+)/, 'Amount'), 'Amount').toBe(prices.amount);
    // A booking without a promo code may have no Credits row; then the credit is $0.
    const credits = /Credits \$/.test(text) ? money(/Credits \$([\d,.]+)/, 'Credits') : 0;
    expect(credits, 'Credits').toBe(prices.credit);
    expect(money(/Sub Total \$([\d,.]+)/, 'Sub Total'), 'Sub Total').toBe(prices.subTotal);
    expect(money(/Sales Tax \+ Platform Fee \$([\d,.]+)/, 'Sales Tax + Platform Fee'), 'Sales Tax + Platform Fee')
      .toBe(toCents(prices.salesTax + prices.platformFee));
    // "Total" on its own, not the "Sub Total" row.
    expect(money(/(?<!Sub )Total \$([\d,.]+)/, 'Total'), 'Total').toBe(prices.totalAmountDue);

    // Commission and earnings.
    const commissionPercent = money(/Commission \(([\d.]+)%\)/, 'Commission %');
    const commission = money(/Commission \([\d.]+%\) \$([\d,.]+)/, 'Commission');
    const localiteEarnings = money(/Localite Earnings[^$]*\$([\d,.]+)/, 'Localite Earnings');
    expect(commission, 'Commission = % x Sub Total').toBe(toCents((commissionPercent / 100) * prices.subTotal));
    expect(localiteEarnings, 'Localite Earnings = Sub Total - Commission').toBe(toCents(prices.subTotal - commission));

    await dialog.locator('button.btn-close').click();
    await expect(dialog).toBeHidden();
    return { commissionPercent, commission, localiteEarnings };
  }
}
