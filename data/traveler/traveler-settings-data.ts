import { loadCsv } from '@data/csv-loader';

/** New account details entered on traveler Settings. */
export interface TravelerSettingsData {
  firstName: string;
  lastName: string;
  phone: string;
}

/** Read testdata/traveler/traveler-settings.csv; every field is required. */
export async function readTravelerSettingsData(): Promise<TravelerSettingsData> {
  const csv = await loadCsv('traveler', 'traveler-settings.csv');

  // The phone widget takes exactly 10 US digits.
  const phone = csv.required('Phone');
  if (!/^\d{10}$/.test(phone)) {
    throw new Error(`Phone in ${csv.path} must be 10 digits.`);
  }

  return {
    firstName: csv.required('First Name'),
    lastName: csv.required('Last Name'),
    phone,
  };
}
