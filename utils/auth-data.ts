// Import utilities for generating random numbers, reading files, and resolving file paths.
import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Import the expected data structure for the signup form from its Page Object file.
import type { SignupFormData } from '../pages/auth/signup-page';

// Build an absolute path to the CSV file containing authentication test data.
// process.cwd() refers to the current project working directory.
const authCsvPath = resolve(process.cwd(), 'testdata', 'auth.csv');

// Define the structure of the authentication data loaded from auth.csv.
// This interface ensures that all required login and signup fields have string values.
export interface AuthData {
  loginEmail: string;
  loginPassword: string;
  signupFullName: string;
  signupEmail: string;
  signupPhone: string;
  signupPassword: string;
}

// Prepare valid signup form data using the values loaded from the CSV file.
// This function validates the input, separates the full name, and generates a unique email.
export function createSignupFormData(authData: AuthData): SignupFormData {
  // Extract the signup-related values from the authentication data object.
  const { signupFullName, signupEmail, signupPhone, signupPassword } = authData;

  // Stop the test early if any required signup value is missing or empty.
  if (!signupFullName || !signupEmail || !signupPhone || !signupPassword) {
    throw new Error('Set all signup fields in testdata/auth.csv before running this flow.');
  }

  // Split the full name into first name and the remaining parts of the last name.
  // Multiple spaces between name parts are treated as a single separator.
  const [firstName, ...lastNameParts] = signupFullName.trim().split(/\s+/);
  const lastName = lastNameParts.join(' ');

  // Ensure the full name contains both a first name and a last name.
  if (!firstName || !lastName) {
    throw new Error('Signup Full Name in testdata/auth.csv must include first and last names.');
  }

  // Find the last @ symbol to separate the email's local part from its domain.
  const separator = signupEmail.lastIndexOf('@');

  // Validate that the email has text before and after the @ symbol.
  if (separator <= 0 || separator === signupEmail.length - 1) {
    throw new Error('Signup Email in testdata/auth.csv must be a valid email address.');
  }

  // Separate the email into its local part and domain.
  // Remove an existing plus suffix from the local part before generating a new one.
 const localPart = signupEmail.slice(0, separator).replace(/\+.*$/, '');
  const domain = signupEmail.slice(separator + 1);

  // Return the data in the format expected by the signup form.
  // A random five-digit number is added to the email to help avoid duplicate accounts.
  return {
    firstName,
    lastName,
    email: `${localPart}+${randomInt(10_000, 100_000)}@${domain}`,
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
    'Signup Full Name',
    'Signup Traveler Email',
    'Signup Phone',
    'Signup Password',
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
    signupFullName: getValue('Signup Full Name'),
    signupEmail: getValue('Signup Traveler Email'),
    signupPhone: getValue('Signup Phone'),
    signupPassword: getValue('Signup Password'),
  };
}