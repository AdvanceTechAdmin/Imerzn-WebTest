import { resolve } from 'node:path';
import { readFieldValueCsv } from './common';
import { splitList } from './experience-data';

const editProfileCsvPath = resolve(process.cwd(), 'testdata', 'localite', 'edit-profile.csv');

/** New profile values entered on Edit Profile. */
export interface EditProfileData {
  firstName: string;
  lastName: string;
  bio: string;
  experiences: string[];
}

/** Read the Edit Profile values from edit-profile.csv; every field is required. */
export async function readEditProfileData(): Promise<EditProfileData> {
  const data = await readFieldValueCsv(editProfileCsvPath);

  const getValue = (field: string): string => {
    const value = data.get(field);
    if (!value) {
      throw new Error(`Set "${field}" in ${editProfileCsvPath}.`);
    }
    return value;
  };

  return {
    firstName: getValue('First Name'),
    lastName: getValue('Last Name'),
    bio: getValue('Bio'),
    experiences: splitList(getValue('Experiences I Host')),
  };
}
