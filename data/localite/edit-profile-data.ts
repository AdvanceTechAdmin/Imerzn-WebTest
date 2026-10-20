import { loadCsv } from '@data/csv-loader';
import { randomLetters } from '@helpers/text';

/** New profile values entered on Edit Profile (testdata/localite/edit-profile.csv). */
export interface EditProfileData {
  firstName: string;
  lastName: string;
  bio: string;
  experiences: string[];
}

/**
 * Read edit-profile.csv; every field is required.
 * The last name is "<Last Name Prefix><6 random letters>" so each run gives the localite
 * a unique name (several localites with the same name would make Search ambiguous).
 */
export async function readEditProfileData(): Promise<EditProfileData> {
  const csv = await loadCsv('localite', 'edit-profile.csv');

  // The site accepts letters only ("Please enter letters only") and at most 15 characters
  // ("Please enter 15 characters only"), so add random letters, not digits or spaces.
  const lastName = `${csv.required('Last Name Prefix')}${randomLetters(6)}`;
  if (!/^[A-Za-z]+$/.test(lastName) || lastName.length > 15) {
    throw new Error(
      `Last name "${lastName}" must be letters only and at most 15 characters; ` +
      `use a letters-only Last Name Prefix of up to 9 characters in ${csv.path}.`,
    );
  }

  return {
    firstName: csv.required('First Name'),
    lastName,
    bio: csv.required('Bio'),
    experiences: csv.list('Experiences I Host'),
  };
}
