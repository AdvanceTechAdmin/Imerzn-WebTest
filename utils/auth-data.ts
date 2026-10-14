// Import utilities for generating random numbers, reading files, and resolving file paths.
import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Import the expected data structure for the signup form from its Page Object file.
import type { SignupFormData } from '../pages/auth/signup-page';
import type { GuideProfileFormData } from '../pages/localite/create-guide-profile-page';
import { splitList } from './experience-data';

// Build an absolute path to the CSV file containing authentication test data.
// process.cwd() refers to the current project working directory.
const authCsvPath = resolve(process.cwd(), 'testdata', 'common', 'auth.csv');

// Define the structure of the authentication data loaded from auth.csv.
// This interface ensures that all required login and signup fields have string values.
export interface AuthData {
  loginEmail: string;
  loginPassword: string;
  loginFirstName: string;
  loginLastName: string;
  loginBio: string;
  signupFullName: string;
  signupEmail: string;
  signupPhone: string;
  signupPassword: string;
  signupOtp: string;
  travelerNewPassword: string;
  localiteNewPassword: string;
  followerEmail: string;
  signupLocaliteEmail: string;
  adminEmail: string;
  adminPassword: string;
  localiteProfilePicture: string;
  localiteBio: string;
  localiteExperiences: string;
  localiteZipcode: string;
}

// Data required to sign up a localite and complete the Create Your Profile form.
export interface LocaliteSignupData {
  signup: SignupFormData;
  profile: GuideProfileFormData;
}

// Prepare localite signup and profile data from auth.csv.
// The email gets a random six-digit suffix so every run creates a new account.
export function createLocaliteSignupData(authData: AuthData): LocaliteSignupData {
  const signup = createSignupFormData(
    { ...authData, signupEmail: authData.signupLocaliteEmail },
    randomInt(100_000, 1_000_000),
  );

  const { localiteProfilePicture, localiteBio, localiteExperiences, localiteZipcode } = authData;
  const experiences = splitList(localiteExperiences);

  if (!localiteProfilePicture || !localiteBio || experiences.length === 0 || !localiteZipcode) {
    throw new Error('Set all Localite profile fields in testdata/common/auth.csv before running this flow.');
  }

  // Fail before signup so a bad path does not leave a half-created account behind.
  const profilePicturePath = resolve(process.cwd(), localiteProfilePicture);
  if (!existsSync(profilePicturePath)) {
    throw new Error(`Localite Profile Picture file does not exist: ${profilePicturePath}`);
  }

  return {
    signup,
    profile: {
      profilePicturePath,
      bio: localiteBio,
      experiences,
      zipcode: localiteZipcode,
    },
  };
}

// Add "+<suffix>" before the @ of an email, e.g. name@x.com -> name+123456@x.com.
// An existing plus suffix is replaced so the result stays unique per run.
export function withEmailSuffix(email: string, suffix: number): string {
  // Find the last @ symbol to separate the email's local part from its domain.
  const separator = email.lastIndexOf('@');

  // Validate that the email has text before and after the @ symbol.
  if (separator <= 0 || separator === email.length - 1) {
    throw new Error(`"${email}" in testdata/common/auth.csv must be a valid email address.`);
  }

  const localPart = email.slice(0, separator).replace(/\+.*$/, '');
  const domain = email.slice(separator + 1);
  return `${localPart}+${suffix}@${domain}`;
}

// Email used to follow a localite: Follower Email from auth.csv + 6 random digits.
export function createFollowerEmail(authData: AuthData): string {
  return withEmailSuffix(authData.followerEmail, randomInt(100_000, 1_000_000));
}

// Prepare valid signup form data using the values loaded from the CSV file.
// This function validates the input, separates the full name, and generates a unique email.
export function createSignupFormData(
  authData: AuthData,
  emailSuffix: number = randomInt(10_000, 100_000),
): SignupFormData {
  // Extract the signup-related values from the authentication data object.
  const { signupFullName, signupEmail, signupPhone, signupPassword } = authData;

  // Stop the test early if any required signup value is missing or empty.
  if (!signupFullName || !signupEmail || !signupPhone || !signupPassword) {
    throw new Error('Set all signup fields in testdata/common/auth.csv before running this flow.');
  }

  // Split the full name into first name and the remaining parts of the last name.
  // Multiple spaces between name parts are treated as a single separator.
  const [firstName, ...lastNameParts] = signupFullName.trim().split(/\s+/);
  const lastName = lastNameParts.join(' ');

  // Ensure the full name contains both a first name and a last name.
  if (!firstName || !lastName) {
    throw new Error('Signup Full Name in testdata/common/auth.csv must include first and last names.');
  }

  // Return the data in the format expected by the signup form.
  // A random number (five digits by default) is added to the email to avoid duplicate accounts.
  return {
    firstName,
    lastName,
    email: withEmailSuffix(signupEmail, emailSuffix),
    phone: signupPhone,
    password: signupPassword,
  };
}

// Parse one CSV line into individual field values.
// This parser supports commas inside quoted fields and escaped double quotes ("").
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;

  // Read the line character by character so commas inside quoted values
  // are not incorrectly treated as column separators.
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    // Inside a quoted field, two consecutive double quotes represent one literal quote.
    if (character === '"' && quoted && line[index + 1] === '"') {
      field += '"';
      index += 1;
    // A double quote starts or ends a quoted field.
    } else if (character === '"') {
      quoted = !quoted;
    // A comma separates fields only when it is outside a quoted field.
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    // Add ordinary characters to the current field.
    } else {
      field += character;
    }
  }

  // Detect a quoted field that was opened but never closed.
  if (quoted) {
    throw new Error(`Unclosed quoted field in ${authCsvPath}.`);
  }

  // Add the final field because the line may not end with a comma.
  fields.push(field);
  return fields;
}

// Read and validate the authentication test data from auth.csv.
// Return a strongly typed object that can be reused by login and signup tests.
export async function readAuthData(): Promise<AuthData> {
  // Read the CSV file as UTF-8 text.
  // Split it into lines, remove blank lines and comment lines, then parse each row.
  const rows = (await readFile(authCsvPath, 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trimStart().startsWith('#'))
    .map(parseCsvRow);

  // Treat the first row as the CSV header and the remaining rows as data records.
  const [headers, ...records] = rows;

  // Confirm that the CSV has the expected two-column header: Field,Value.
  if (headers?.[0]?.trim().toLowerCase() !== 'field' ||
      headers[1]?.trim().toLowerCase() !== 'value') {
    throw new Error(`Expected Field,Value headers in ${authCsvPath}.`);
  }

  // Store each field name and its value in a Map for easy lookup.
  const data = new Map<string, string>();

  // Validate each record before adding it to the Map.
  for (const record of records) {
    const [field, value] = record;

    // Every record must contain exactly two defined values: a field name and a value.
    if (record.length !== 2 || field === undefined || value === undefined) {
      throw new Error(`Every row in ${authCsvPath} must contain a Field and Value.`);
    }

    // Remove surrounding whitespace from the field name.
    const key = field.trim();

    // Reject duplicate field names to avoid ambiguous test data.
    if (data.has(key)) {
      throw new Error(`Duplicate auth field "${key}" in ${authCsvPath}.`);
    }

    // Store the field and its trimmed value.
    data.set(key, value.trim());
  }

  // List all fields that must exist in the CSV file.
  // 'as const' preserves the exact field names as TypeScript literal types.
  const requiredFields = [
    'Login Email',
    'Login Password',
    'Login First Name',
    'Login Last Name',
    'Login Bio',
    'Signup Full Name',
    'Signup Traveler Email',
    'Signup Phone',
    'Signup Password',
    'Signup OTP',
    'Traveler New Password',
    'Localite New Password',
    'Follower Email',
    'Signup Localite Email',
    'Admin Email',
    'Admin Password',
    'Localite Profile Picture',
    'Localite Bio',
    'Localite Experiences I Host',
    'Localite Zipcode',
  ] as const;

  // Find required fields that are missing from the CSV data.
  const missingFields = requiredFields.filter((field) => !data.has(field));

  // Fail with a clear error message if any required field is absent.
  if (missingFields.length > 0) {
    throw new Error(`Missing auth CSV fields: ${missingFields.join(', ')}.`);
  }

  // Retrieve a required value from the Map.
  // The field type is restricted to the names listed in requiredFields.
  const getValue = (field: (typeof requiredFields)[number]): string => {
    const value = data.get(field);

    // Provide a clear error if the requested field cannot be found.
    if (value === undefined) {
      throw new Error(`Missing auth CSV field "${field}" in ${authCsvPath}.`);
    }

    return value;
  };

  // Return the validated CSV values as a typed AuthData object.
  // Tests can use this object without reading or parsing the CSV themselves.
  return {
    loginEmail: getValue('Login Email'),
    loginPassword: getValue('Login Password'),
    loginFirstName: getValue('Login First Name'),
    loginLastName: getValue('Login Last Name'),
    loginBio: getValue('Login Bio'),
    signupFullName: getValue('Signup Full Name'),
    signupEmail: getValue('Signup Traveler Email'),
    signupPhone: getValue('Signup Phone'),
    signupPassword: getValue('Signup Password'),
    signupOtp: getValue('Signup OTP'),
    travelerNewPassword: getValue('Traveler New Password'),
    localiteNewPassword: getValue('Localite New Password'),
    followerEmail: getValue('Follower Email'),
    signupLocaliteEmail: getValue('Signup Localite Email'),
    adminEmail: getValue('Admin Email'),
    adminPassword: getValue('Admin Password'),
    localiteProfilePicture: getValue('Localite Profile Picture'),
    localiteBio: getValue('Localite Bio'),
    localiteExperiences: getValue('Localite Experiences I Host'),
    localiteZipcode: getValue('Localite Zipcode'),
  };
}