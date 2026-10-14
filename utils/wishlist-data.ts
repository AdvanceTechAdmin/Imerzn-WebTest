import { randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { readFieldValueCsv } from './common';

const wishlistCsvPath = resolve(process.cwd(), 'testdata', 'traveler', 'wishlist.csv');

/**
 * Read wishlist data from wishlist.csv.
 * The name is "<Name Prefix> <6 random digits>" so every run creates a new wishlist.
 */
export async function readWishlistName(): Promise<string> {
  const prefix = (await readFieldValueCsv(wishlistCsvPath)).get('Name Prefix');
  if (!prefix) {
    throw new Error(`Set "Name Prefix" in ${wishlistCsvPath}.`);
  }
  return `${prefix} ${randomInt(100_000, 1_000_000)}`;
}
