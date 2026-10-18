import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFieldValueCsv, splitList } from '../common/common';

const referralCsvPath = resolve(process.cwd(), 'testdata', 'localite', 'Referral-program.csv');

/** A localite who signs up with the referral code. */
export interface Referee {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Referral program data. Phone, OTP, and the admin login are not here: they come from
 * testdata/common/auth.csv, which is local only. The shared Password is here on purpose
 * (test-only password, visible in the public repo since this CSV is in git).
 */
export interface ReferralProgramData {
  /** Localite who owns the referral code. */
  referrerEmail: string;
  referralCode: string;
  /** Password of every account in the referral program (referrer, referees, traveler). */
  password: string;
  /** Expected Referral % and Status in the referrer's Referral History. */
  referralPercent: string;
  referralStatus: string;
  referees: Referee[];
  signupSource: string;
  profile: {
    profilePicturePath: string;
    bio: string;
    experiences: string[];
    zipcode: string;
  };
  /** Experience the referee hosts; other form values come from create-experience.csv. */
  experience: { title: string; price: string };
  /** Traveler account for the referral program. */
  traveler: { email: string; firstName: string; lastName: string };
  /** The traveler's booking of the experience (card and billing come from testdata/traveler/booking.csv). */
  booking: { groupSize: number; note: string };
}

/** Read Referral-program.csv. */
export async function readReferralProgramData(): Promise<ReferralProgramData> {
  const data = await readFieldValueCsv(referralCsvPath);
  const getValue = (field: string): string => {
    const value = data.get(field);
    if (!value) {
      throw new Error(`Set "${field}" in ${referralCsvPath}.`);
    }
    return value;
  };

  const referees: Referee[] = [];
  for (let n = 1; data.has(`Referee ${n} Email`); n++) {
    referees.push({
      email: getValue(`Referee ${n} Email`),
      firstName: getValue(`Referee ${n} First Name`),
      lastName: getValue(`Referee ${n} Last Name`),
    });
  }

  const profilePicturePath = resolve(process.cwd(), getValue('Profile Picture'));
  if (!existsSync(profilePicturePath)) {
    throw new Error(`Profile Picture file does not exist: ${profilePicturePath}`);
  }

  return {
    referrerEmail: getValue('Referrer Email'),
    referralCode: getValue('Referral Code'),
    password: getValue('Password'),
    referralPercent: getValue('Referral Percent'),
    referralStatus: getValue('Referral Status'),
    referees,
    signupSource: getValue('Signup Source'),
    profile: {
      profilePicturePath,
      bio: getValue('Bio'),
      experiences: splitList(getValue('Experiences I Host')),
      zipcode: getValue('Zipcode'),
    },
    experience: {
      title: getValue('Experience Title'),
      price: getValue('Experience Price'),
    },
    traveler: {
      email: getValue('Traveler Email'),
      firstName: getValue('Traveler First Name'),
      lastName: getValue('Traveler Last Name'),
    },
    booking: {
      groupSize: Number(getValue('Booking Group Size')),
      note: getValue('Booking Note'),
    },
  };
}
