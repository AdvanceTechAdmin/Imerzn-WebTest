import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Local-only file that hands the traveler created by AUTH-003 to later tests.
const createdTravelerPath = resolve(process.cwd(), 'testdata', 'traveler', 'created-traveler.json');

export interface TravelerAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Save the traveler account created by the traveler signup test. */
export async function saveCreatedTraveler(account: TravelerAccount): Promise<void> {
  await writeFile(createdTravelerPath, `${JSON.stringify(account, null, 2)}\n`, 'utf8');
}

/** Traveler account saved by AUTH-003; fails with a clear message if it has not run yet. */
export async function getTravelerAccount(): Promise<TravelerAccount> {
  if (!existsSync(createdTravelerPath)) {
    throw new Error(
      `${createdTravelerPath} not found. Run the traveler signup test (AUTH-003) first: ` +
      "$env:RUN_SIGNUP_TEST='true'; npm run test:signup",
    );
  }

  const account = JSON.parse(await readFile(createdTravelerPath, 'utf8')) as Partial<TravelerAccount>;
  const { email, password, firstName, lastName } = account;
  if (!email || !password || !firstName || !lastName) {
    throw new Error(`${createdTravelerPath} must contain email, password, firstName, and lastName.`);
  }
  return { email, password, firstName, lastName };
}

// Local-only file recording the bookings made by the booking test (BKG-001).
const createdBookingsPath = resolve(process.cwd(), 'testdata', 'traveler', 'created-bookings.json');

/** A booking made by the booking test, as it should appear in My Bookings and Transactions. */
export interface CreatedBooking {
  experienceTitle: string;
  localiteName: string;
  /** Traveler first + last name entered in the booking form (shown to the localite). */
  travelerName?: string;
  location: string;
  /** Date as shown on the site, MM-DD-YYYY. */
  date: string;
  /** Start time as chosen in the form, e.g. "09:00 AM". */
  startTime: string;
  durationHours: number;
  people: number;
  pricePerPerson: number;
  notes: string;
  /** Price breakdown after the promo code; only set for the paid booking. */
  prices?: {
    amount: number;
    credit: number;
    subTotal: number;
    salesTax: number;
    platformFee: number;
    totalAmountDue: number;
  };
  /** Amount paid; only set for the paid booking. */
  amountPaid?: number;
  /** Date the payment was made, MM-DD-YYYY; only set for the paid booking. */
  paidOn?: string;
}

export interface CreatedBookings {
  travelerEmail: string;
  paid: CreatedBooking[];
  pending: CreatedBooking[];
}

async function readBookingsFile(): Promise<CreatedBookings | undefined> {
  if (!existsSync(createdBookingsPath)) {
    return undefined;
  }
  const data = JSON.parse(await readFile(createdBookingsPath, 'utf8')) as Partial<CreatedBookings>;
  // Older files stored a single paid/pending booking; treat them as empty.
  if (!data.travelerEmail || !Array.isArray(data.paid) || !Array.isArray(data.pending)) {
    return undefined;
  }
  return data as CreatedBookings;
}

/**
 * Record a booking (paid or pending) for the traveler. Bookings are added to the list, like the
 * site keeps them; the list starts over when the traveler changes.
 */
export async function saveCreatedBooking(
  travelerEmail: string,
  kind: 'paid' | 'pending',
  booking: CreatedBooking,
): Promise<void> {
  const current = await readBookingsFile();
  const next: CreatedBookings = current?.travelerEmail === travelerEmail
    ? current
    : { travelerEmail, paid: [], pending: [] };
  next[kind].push(booking);
  await writeFile(createdBookingsPath, `${JSON.stringify(next, null, 2)}
`, 'utf8');
}

/** Bookings recorded for the traveler; fails with a clear message if BKG-001 has not run for them. */
export async function readCreatedBookings(
  travelerEmail: string,
): Promise<{ paid: CreatedBooking[]; pending: CreatedBooking[] }> {
  const data = await readBookingsFile();
  if (!data || data.travelerEmail !== travelerEmail || data.paid.length === 0 || data.pending.length === 0) {
    throw new Error(
      `No paid and pending bookings recorded for ${travelerEmail} in ${createdBookingsPath}. ` +
      'Run the booking test (experience-booking.spec.ts) first.',
    );
  }
  return { paid: data.paid, pending: data.pending };
}
