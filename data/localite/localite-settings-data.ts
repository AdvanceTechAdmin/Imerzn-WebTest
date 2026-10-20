import { loadCsv } from '@data/csv-loader';

/** New phone and Bio entered on localite Settings, plus the Business name the site requires to save. */
export interface LocaliteSettingsData {
  phone: string;
  bio: string;
  businessName: string;
}

/** Read testdata/localite/localite-settings.csv; every field is required. */
export async function readLocaliteSettingsData(): Promise<LocaliteSettingsData> {
  const csv = await loadCsv('localite', 'localite-settings.csv');

  // The phone widget takes exactly 10 US digits.
  const phone = csv.required('Phone');
  if (!/^\d{10}$/.test(phone)) {
    throw new Error(`Phone in ${csv.path} must be 10 digits.`);
  }

  // The site limits Bio to 500 characters.
  const bio = csv.required('Bio');
  if (bio.length > 500) {
    throw new Error(`Bio in ${csv.path} must be at most 500 characters.`);
  }

  return { phone, bio, businessName: csv.required('Business Name') };
}
