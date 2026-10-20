import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SignupFormData } from '@pages/auth/signup-page';
import type { GuideProfileFormData } from '@pages/localite/create-guide-profile-page';
import { loadCsv } from '@data/csv-loader';
import { randomSixDigits, splitList } from '@helpers/text';

/**
 * Login, signup, and admin values from testdata/common/auth.csv.
 * The file is local only (git-ignored); CI restores it from the AUTH_CSV_BASE64 secret.
 */
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

/** Data required to sign up a localite and complete the Create Your Profile form. */
export interface LocaliteSignupData {
  signup: SignupFormData;
  profile: GuideProfileFormData;
}

/** Read auth.csv. Every field must have a row; signup helpers below check the values they need. */
export async function readAuthData(): Promise<AuthData> {
  const csv = await loadCsv('common', 'auth.csv');

  // Map each CSV field name to its AuthData property.
  return {
    loginEmail: csv.present('Login Email'),
    loginPassword: csv.present('Login Password'),
    loginFirstName: csv.present('Login First Name'),
    loginLastName: csv.present('Login Last Name'),
    loginBio: csv.present('Login Bio'),
    signupFullName: csv.present('Signup Full Name'),
    signupEmail: csv.present('Signup Traveler Email'),
    signupPhone: csv.present('Signup Phone'),
    signupPassword: csv.present('Signup Password'),
    signupOtp: csv.present('Signup OTP'),
    travelerNewPassword: csv.present('Traveler New Password'),
    localiteNewPassword: csv.present('Localite New Password'),
    followerEmail: csv.present('Follower Email'),
    signupLocaliteEmail: csv.present('Signup Localite Email'),
    adminEmail: csv.present('Admin Email'),
    adminPassword: csv.present('Admin Password'),
    localiteProfilePicture: csv.present('Localite Profile Picture'),
    localiteBio: csv.present('Localite Bio'),
    localiteExperiences: csv.present('Localite Experiences I Host'),
    localiteZipcode: csv.present('Localite Zipcode'),
  };
}

/**
 * Prepare localite signup and profile data from auth.csv.
 * The email gets a random six-digit suffix so every run creates a new account.
 */
export function createLocaliteSignupData(authData: AuthData): LocaliteSignupData {
  // Signup form: same fields as a traveler, with the localite email.
  const signup = createSignupFormData(
    { ...authData, signupEmail: authData.signupLocaliteEmail },
    randomSixDigits(),
  );

  // Create Your Profile form: every field is required.
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
    profile: { profilePicturePath, bio: localiteBio, experiences, zipcode: localiteZipcode },
  };
}

/**
 * Add "+<suffix>" before the @ of an email, e.g. name@x.com -> name+123456@x.com.
 * An existing plus suffix is replaced so the result stays unique per run.
 */
export function withEmailSuffix(email: string, suffix: number): string {
  // The email needs text before and after the last @.
  const separator = email.lastIndexOf('@');
  if (separator <= 0 || separator === email.length - 1) {
    throw new Error(`"${email}" in testdata/common/auth.csv must be a valid email address.`);
  }

  const localPart = email.slice(0, separator).replace(/\+.*$/, '');
  const domain = email.slice(separator + 1);
  return `${localPart}+${suffix}@${domain}`;
}

/** Email used to follow a localite: Follower Email from auth.csv + 6 random digits. */
export function createFollowerEmail(authData: AuthData): string {
  return withEmailSuffix(authData.followerEmail, randomSixDigits());
}

/**
 * Prepare valid signup form data from auth.csv: split the full name into first and last name,
 * and add a random number (five digits by default) to the email so every run is a new account.
 */
export function createSignupFormData(
  authData: AuthData,
  emailSuffix: number = randomInt(10_000, 100_000),
): SignupFormData {
  // Every signup value is required.
  const { signupFullName, signupEmail, signupPhone, signupPassword } = authData;
  if (!signupFullName || !signupEmail || !signupPhone || !signupPassword) {
    throw new Error('Set all signup fields in testdata/common/auth.csv before running this flow.');
  }

  // "First Last Name" -> first name "First", last name "Last Name".
  const [firstName, ...lastNameParts] = signupFullName.trim().split(/\s+/);
  const lastName = lastNameParts.join(' ');
  if (!firstName || !lastName) {
    throw new Error('Signup Full Name in testdata/common/auth.csv must include first and last names.');
  }

  return {
    firstName,
    lastName,
    email: withEmailSuffix(signupEmail, emailSuffix),
    phone: signupPhone,
    password: signupPassword,
  };
}
