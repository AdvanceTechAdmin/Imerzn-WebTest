import { loadCsv } from '@data/csv-loader';

/** Values used to book and pay for an experience (testdata/traveler/booking.csv). */
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

/** Midnight today plus a number of days. */
function daysFromToday(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

/** Read booking.csv; each booking date is today + its "Days From Today". */
export async function readBookingData(): Promise<BookingData> {
  const csv = await loadCsv('traveler', 'booking.csv');

  // Read "<prefix> Days From Today", "<prefix> Group Size", and "<prefix> Note" for an extra booking.
  const extra = (prefix: string): ExtraBooking => ({
    date: daysFromToday(csv.number(`${prefix} Days From Today`)),
    groupSize: csv.number(`${prefix} Group Size`),
    note: csv.required(`${prefix} Note`),
  });

  return {
    // First booking: paid with the promo code.
    date: daysFromToday(csv.number('Days From Today')),
    groupSize: csv.number('Group Size'),
    note: csv.required('Note'),
    promoCode: csv.required('Promo Code'),
    creditPerPerson: csv.number('Credit Per Person'),
    // Test card and billing address, shared by every payment.
    card: {
      number: csv.required('Card Number'),
      expiry: csv.required('Card Expiry'),
      cvv: csv.required('Card CVV'),
    },
    billing: {
      fullName: csv.required('Billing Full Name'),
      location: csv.required('Billing Location'),
      address: csv.required('Billing Address'),
      zip: csv.required('Billing Zip'),
    },
    // The other three bookings.
    pending: extra('Pending'),
    paid2: extra('Paid 2'),
    pending2: extra('Pending 2'),
    // Cancel reasons for the cancel tests.
    cancelReason: csv.required('Cancel Reason'),
    localiteCancelReason: csv.required('Localite Cancel Reason'),
  };
}
