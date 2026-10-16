import { resolve } from 'node:path';
import { readFieldValueCsv } from '../common/common';

const localiteSettingsCsvPath = resolve(process.cwd(), 'testdata', 'localite', 'localite-settings.csv');

/** New phone and Bio entered on localite Settings, plus the Business name the site requires to save. */
export interface LocaliteSettingsData {
  phone: string;
  bio: string;
  businessName: string;
}

/** Read localite-settings.csv; every field is required. */
export async function readLocaliteSettingsData(): Promise<LocaliteSettingsData> {
  const data = await readFieldValueCsv(localiteSettingsCsvPath);
  const phone = data.get('Phone');
  const bio = data.get('Bio');

  if (!phone || !/^\d{10}$/.test(phone)) {
    throw new Error(`Phone in ${localiteSettingsCsvPath} must be 10 digits.`);
  }
  if (!bio || bio.length > 500) {
    throw new Error(`Bio in ${localiteSettingsCsvPath} is required and must be at most 500 characters.`);
  }
  const businessName = data.get('Business Name');
  if (!businessName) {
    throw new Error(`Set Business Name in ${localiteSettingsCsvPath}.`);
  }
  return { phone, bio, businessName };
}
