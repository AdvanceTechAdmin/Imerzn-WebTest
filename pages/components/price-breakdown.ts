import type { Locator } from '@playwright/test';

/** Price rows shown in the Book Experience and Payment dialogs. */
export interface PriceBreakdown {
  people: number;
  amount: number;
  credit: number;
  subTotal: number;
  salesTax: number;
  platformFeePercent: number;
  platformFee: number;
  totalAmountDue: number;
}

const money = (text: string): number => Number(text.replace(/,/g, ''));

/**
 * Read the price rows from a dialog's text, e.g.
 * "Amount (4 people) $180.00  Credit $40.00  Sub Total $140.00  Sales Tax $0.00
 *  Platform Fee (2%) $2.80  Total Amount Due $142.80".
 */
export async function readPriceBreakdown(scope: Locator): Promise<PriceBreakdown> {
  const text = (await scope.innerText()).replace(/\s+/g, ' ');
  const find = (pattern: RegExp, label: string): RegExpMatchArray => {
    const match = text.match(pattern);
    if (!match) {
      throw new Error(`Could not find "${label}" in the price breakdown: ${text.slice(0, 400)}`);
    }
    return match;
  };

  const amount = find(/Amount \((\d+) (?:people|person)\) \$([\d,.]+)/, 'Amount');
  const credit = text.match(/Credit(?: \([^)]*\))? \$([\d,.]+)/);
  const fee = find(/Platform Fee \(([\d.]+)%\) \$([\d,.]+)/, 'Platform Fee');

  return {
    people: Number(amount[1]),
    amount: money(amount[2]),
    credit: credit ? money(credit[1]) : 0,
    subTotal: money(find(/Sub Total \$([\d,.]+)/, 'Sub Total')[1]),
    salesTax: money(find(/Sales Tax \$([\d,.]+)/, 'Sales Tax')[1]),
    platformFeePercent: Number(fee[1]),
    platformFee: money(fee[2]),
    totalAmountDue: money(find(/Total Amount Due \$([\d,.]+)/, 'Total Amount Due')[1]),
  };
}

/** Round to cents, the way prices are shown. */
export function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}
