import { resolve } from 'node:path';
import { readFieldValueCsv } from '../common/common';

const travelerSettingsCsvPath = resolve(process.cwd(), 'testdata', 'traveler', 'traveler-settings.csv');

/** New account details entered on traveler Settings. */
export interface TravelerSettingsData {
  firstName: string;
  lastName: string;
  phone: string;
}

/** Read the traveler Settings values from traveler-settings.csv; every field is required. */
export async function readTravelerSettingsData(): Promise<TravelerSettingsData> {
  const data = await readFieldValueCsv(travelerSettingsCsvPath);

  const getValue = (field: string): string => {
    const value = data.get(field);
    if (!value) {
      throw new Error(`Set "${field}" in ${travelerSettingsCsvPath}.`);
    }
    return value;
  };

  const phone = getValue('Phone');
  if (!/^\d{10}$/.test(phone)) {
    throw new Error(`Phone in ${travelerSettingsCsvPath} must be 10 digits.`);
  }

  return {
    firstName: getValue('First Name'),
    lastName: getValue('Last Name'),
    phone,
  };
}
