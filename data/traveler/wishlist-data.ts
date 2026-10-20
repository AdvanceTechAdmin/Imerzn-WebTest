import { loadCsv } from '@data/csv-loader';
import { randomSixDigits } from '@helpers/text';

/**
 * Read testdata/traveler/wishlist.csv.
 * The name is "<Name Prefix> <6 random digits>" so every run creates a new wishlist.
 */
export async function readWishlistName(): Promise<string> {
  const csv = await loadCsv('traveler', 'wishlist.csv');
  return `${csv.required('Name Prefix')} ${randomSixDigits()}`;
}
