import { randomInt } from 'node:crypto';
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

/**
 * Read the Edit Profile values from edit-profile.csv; every field is required.
 * The last name is "<Last Name Prefix> <6 random digits>" so each run gives the localite
 * a unique name (several localites with the same name would make Search ambiguous).
 */
export async function readEditProfileData(): Promise<EditProfileData> {
  const data = await readFieldValueCsv(editProfileCsvPath);

  const getValue = (field: string): string => {
    const value = data.get(field);
    if (!value) {
      throw new Error(`Set "${field}" in ${editProfileCsvPath}.`);
    }
    return value;
  };

  // The site accepts letters only ("Please enter letters only") and at most 15 characters
  // ("Please enter 15 characters only"), so add random letters, not digits or spaces.
  const lastName = `${getValue('Last Name Prefix')}${randomLetters(6)}`;
  if (!/^[A-Za-z]+$/.test(lastName) || lastName.length > 15) {
    throw new Error(
      `Last name "${lastName}" must be letters only and at most 15 characters; ` +
      `use a letters-only Last Name Prefix of up to 9 characters in ${editProfileCsvPath}.`,
    );
  }

  return {
    firstName: getValue('First Name'),
    lastName,
    bio: getValue('Bio'),
    experiences: splitList(getValue('Experiences I Host')),
  };
}

/** Random lowercase letters, e.g. "qkzmwp". */
function randomLetters(count: number): string {
  let letters = '';
  for (let i = 0; i < count; i += 1) {
    letters += String.fromCharCode(97 + randomInt(0, 26));
  }
  return letters;
}
