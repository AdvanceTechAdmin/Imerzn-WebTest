import { resolve } from 'node:path';
import { readFieldValueCsv } from '../common/common';

const bookingCsvPath = resolve(process.cwd(), 'testdata', 'traveler', 'booking.csv');

/** Values used to book and pay for an experience. */
export interface BookingData {
  date: Date;
  groupSize: number;
  note: string;
  promoCode: string;
  creditPerPerson: number;
  card: { number: string; expiry: string; cvv: string };
  billing: { fullName: string; location: string; address: string; zip: string };
  /** Second booking that is booked but not paid. */
  pending: ExtraBooking;
  /** Third booking: paid, without a promo code. */
  paid2: ExtraBooking;
  /** Fourth booking: booked but not paid. */
  pending2: ExtraBooking;
  /** Reason entered when the traveler cancels a booking. */
  cancelReason: string;
  /** Reason entered when the localite cancels a booking. */
  localiteCancelReason: string;
}

/** Date, group size, and note for one more booking. */
export interface ExtraBooking {
  date: Date;
  groupSize: number;
  note: string;
}

/** Format a date the way the site shows it, e.g. "10-16-2026" (MM-DD-YYYY). */
export function toSiteDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()}`;
}

/** Read booking.csv; the booking date is today + "Days From Today". */
export async function readBookingData(): Promise<BookingData> {
  const data = await readFieldValueCsv(bookingCsvPath);

  const getValue = (field: string): string => {
    const value = data.get(field);
    if (!value) {
      throw new Error(`Set "${field}" in ${bookingCsvPath}.`);
    }
    return value;
  };
  const getNumber = (field: string): number => {
    const value = Number(getValue(field));
    if (!Number.isFinite(value)) {
      throw new Error(`"${field}" in ${bookingCsvPath} must be a number.`);
    }
    return value;
  };

  const daysFromToday = (days: number): Date => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
  };

  return {
    date: daysFromToday(getNumber('Days From Today')),
    groupSize: getNumber('Group Size'),
    note: getValue('Note'),
    promoCode: getValue('Promo Code'),
    creditPerPerson: getNumber('Credit Per Person'),
    card: {
      number: getValue('Card Number'),
      expiry: getValue('Card Expiry'),
      cvv: getValue('Card CVV'),
    },
    billing: {
      fullName: getValue('Billing Full Name'),
      location: getValue('Billing Location'),
      address: getValue('Billing Address'),
      zip: getValue('Billing Zip'),
    },
    pending: extra('Pending'),
    paid2: extra('Paid 2'),
    pending2: extra('Pending 2'),
    cancelReason: getValue('Cancel Reason'),
    localiteCancelReason: getValue('Localite Cancel Reason'),
  };

  /** Read "<prefix> Days From Today", "<prefix> Group Size", and "<prefix> Note". */
  function extra(prefix: string): ExtraBooking {
    return {
      date: daysFromToday(getNumber(`${prefix} Days From Today`)),
      groupSize: getNumber(`${prefix} Group Size`),
      note: getValue(`${prefix} Note`),
    };
  }
}
