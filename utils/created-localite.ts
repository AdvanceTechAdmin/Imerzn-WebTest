import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readAuthData } from './auth-data';

// Local-only file that hands the localite created by LOC-001 to later tests.
const createdLocalitePath = resolve(process.cwd(), 'testdata', 'localite', 'created-localite.json');

// Local-only file recording the latest experience/gallery titles created per localite email.
const createdContentPath = resolve(process.cwd(), 'testdata', 'localite', 'created-content.json');

export interface LocaliteAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bio: string;
}

/** Content the tests created for a localite, and profile values changed by Edit Profile. */
export interface CreatedContent {
  experienceTitle?: string;
  galleryTitle?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
}

/** Save the localite account created and verified by the signup test. */
export async function saveCreatedLocalite(account: LocaliteAccount): Promise<void> {
  await writeFile(createdLocalitePath, `${JSON.stringify(account, null, 2)}\n`, 'utf8');
}

/** Read the last created localite account, or undefined if LOC-001 has not run yet. */
export async function readCreatedLocalite(): Promise<LocaliteAccount | undefined> {
  if (!existsSync(createdLocalitePath)) {
    return undefined;
  }

  const account = JSON.parse(await readFile(createdLocalitePath, 'utf8')) as Partial<LocaliteAccount>;
  const { email, password, firstName, lastName, bio } = account;
  if (!email || !password || !firstName || !lastName || !bio) {
    throw new Error(
      `${createdLocalitePath} must contain email, password, firstName, lastName, and bio. ` +
      'Delete it or re-run LOC-001.',
    );
  }

  return { email, password, firstName, lastName, bio };
}

/**
 * Localite account for tests that need to log in as a localite:
 * the account created by LOC-001 if saved, otherwise the Login rows from auth.csv.
 * Name and bio changed by Edit Profile (recorded in created-content.json) take priority.
 */
export async function getLocaliteAccount(): Promise<LocaliteAccount> {
  const authData = await readAuthData();
  const account = await readCreatedLocalite() ?? {
    email: authData.loginEmail,
    password: authData.loginPassword,
    firstName: authData.loginFirstName,
    lastName: authData.loginLastName,
    bio: authData.loginBio,
  };

  const { firstName, lastName, bio } = await readCreatedContent(account.email);
  return {
    ...account,
    firstName: firstName ?? account.firstName,
    lastName: lastName ?? account.lastName,
    bio: bio ?? account.bio,
  };
}

async function readAllCreatedContent(): Promise<Record<string, CreatedContent>> {
  if (!existsSync(createdContentPath)) {
    return {};
  }
  return JSON.parse(await readFile(createdContentPath, 'utf8')) as Record<string, CreatedContent>;
}

/** Record content created for a localite, keeping titles saved by other tests. */
export async function saveCreatedContent(email: string, content: CreatedContent): Promise<void> {
  const all = await readAllCreatedContent();
  all[email] = { ...all[email], ...content };
  await writeFile(createdContentPath, `${JSON.stringify(all, null, 2)}\n`, 'utf8');
}

/** Read the content recorded for a localite (empty if nothing was created yet). */
export async function readCreatedContent(email: string): Promise<CreatedContent> {
  return (await readAllCreatedContent())[email] ?? {};
}

// Local-only file that hands the traveler created by AUTH-003 to later tests.
const createdTravelerPath = resolve(process.cwd(), 'testdata', 'traveler', 'created-traveler.json');

export interface TravelerAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Save the traveler account created by the traveler signup test. */
export async function saveCreatedTraveler(account: TravelerAccount): Promise<void> {
  await writeFile(createdTravelerPath, `${JSON.stringify(account, null, 2)}\n`, 'utf8');
}

/** Traveler account saved by AUTH-003; fails with a clear message if it has not run yet. */
export async function getTravelerAccount(): Promise<TravelerAccount> {
  if (!existsSync(createdTravelerPath)) {
    throw new Error(
      `${createdTravelerPath} not found. Run the traveler signup test (AUTH-003) first: ` +
      "$env:RUN_SIGNUP_TEST='true'; npm run test:signup",
    );
  }

  const account = JSON.parse(await readFile(createdTravelerPath, 'utf8')) as Partial<TravelerAccount>;
  const { email, password, firstName, lastName } = account;
  if (!email || !password || !firstName || !lastName) {
    throw new Error(`${createdTravelerPath} must contain email, password, firstName, and lastName.`);
  }
  return { email, password, firstName, lastName };
}
