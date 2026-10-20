import { loadCsv } from '@data/csv-loader';

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

/** Read testdata/localite/Referral-program.csv; every field is required. */
export async function readReferralProgramData(): Promise<ReferralProgramData> {
  const csv = await loadCsv('localite', 'Referral-program.csv');

  // Referees are numbered rows: "Referee 1 Email", "Referee 2 Email", ... until one is missing.
  const referees: Referee[] = [];
  for (let n = 1; csv.has(`Referee ${n} Email`); n++) {
    referees.push({
      email: csv.required(`Referee ${n} Email`),
      firstName: csv.required(`Referee ${n} First Name`),
      lastName: csv.required(`Referee ${n} Last Name`),
    });
  }

  return {
    referrerEmail: csv.required('Referrer Email'),
    referralCode: csv.required('Referral Code'),
    password: csv.required('Password'),
    referralPercent: csv.required('Referral Percent'),
    referralStatus: csv.required('Referral Status'),
    referees,
    signupSource: csv.required('Signup Source'),
    profile: {
      profilePicturePath: csv.existingFile('Profile Picture'),
      bio: csv.required('Bio'),
      experiences: csv.list('Experiences I Host'),
      zipcode: csv.required('Zipcode'),
    },
    experience: {
      title: csv.required('Experience Title'),
      price: csv.required('Experience Price'),
    },
    traveler: {
      email: csv.required('Traveler Email'),
      firstName: csv.required('Traveler First Name'),
      lastName: csv.required('Traveler Last Name'),
    },
    booking: {
      groupSize: csv.number('Booking Group Size'),
      note: csv.required('Booking Note'),
    },
  };
}
