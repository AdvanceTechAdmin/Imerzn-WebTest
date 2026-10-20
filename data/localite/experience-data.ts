import { readFieldValueCsv, testDataPath } from '@data/csv-loader';

/** Absolute path of testdata/localite/create-experience.csv. */
export const experienceCsvPath = testDataPath('localite', 'create-experience.csv');

/** CSV field name -> property name in ExperienceData. Every field must have a row in the CSV. */
const fieldNames = {
  'Experience Type': 'experience_type',
  Title: 'title',
  Category: 'categories',
  Location: 'location',
  Price: 'price',
  'Know Before': 'know_before',
  'Transport Type': 'transport_type',
  Accessibility: 'accessibility',
  'Min People': 'min_people',
  'Max People': 'max_people',
  'Multi Day': 'multi_day',
  Duration: 'duration',
  'Same Time All Days': 'sameTimeAllDays',
  'Starting Times': 'starting_times',
  'Meeting Point': 'meeting_point',
  'Drop-off Point': 'drop_off_point',
  Status: 'status',
  'Meeting/Drop-off Notes': 'meeting_drop_notes',
  Included: 'included',
  Description: 'description',
  Policy: 'policy',
  'Primary Image': 'primary_image_path',
  'Additional Media': 'additional_media_paths',
} as const;

/** Values of the Create Experience form, as written in the CSV (lists still "|"-separated). */
export type ExperienceData = Record<(typeof fieldNames)[keyof typeof fieldNames], string>;

/** Read create-experience.csv. Unknown or missing fields are errors; Title must not be empty. */
export async function readExperienceData(): Promise<ExperienceData> {
  const csv = await readFieldValueCsv(experienceCsvPath);

  // Reject field names the form does not know (usually a typo in the CSV).
  const unknown = [...csv.keys()].filter((field) => !(field in fieldNames));
  if (unknown.length > 0) {
    throw new Error(`Unknown experience field(s) ${unknown.join(', ')} in ${experienceCsvPath}.`);
  }

  // Every form field needs a row, even if its value is empty.
  const missing = Object.keys(fieldNames).filter((field) => !csv.has(field));
  if (missing.length > 0) {
    throw new Error(`Missing CSV field rows: ${missing.join(', ')} in ${experienceCsvPath}.`);
  }

  // Copy each value to its ExperienceData property.
  const data = Object.fromEntries(
    Object.entries(fieldNames).map(([field, property]) => [property, csv.get(field) ?? '']),
  ) as ExperienceData;

  if (!data.title) {
    throw new Error(`Enter a title in ${experienceCsvPath} before running Create Experience.`);
  }
  return data;
}

/** Parse a Yes/No (or True/False) CSV value; an empty value means "leave the form default". */
export function parseBoolean(value: string, column: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (['yes', 'true'].includes(normalized)) {
    return true;
  }
  if (['no', 'false'].includes(normalized)) {
    return false;
  }
  throw new Error(`CSV field "${column}" must be Yes/No or True/False.`);
}
