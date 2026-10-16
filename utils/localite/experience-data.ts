import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseCsv } from '../common/common';

export const experienceCsvPath = resolve(
  process.cwd(),
  'testdata',
  'localite',
  'create-experience.csv',
);

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

export type ExperienceData = Record<(typeof fieldNames)[keyof typeof fieldNames], string>;

function isCompleteExperienceData(
  data: Partial<ExperienceData>,
): data is ExperienceData {
  return Object.values(fieldNames).every((column) => column in data);
}

export async function readExperienceData(): Promise<ExperienceData> {
  const [headers, ...records] = parseCsv(await readFile(experienceCsvPath, 'utf8'), experienceCsvPath);
  if (headers?.[0]?.trim().toLowerCase() !== 'field' ||
      headers[1]?.trim().toLowerCase() !== 'value') {
    throw new Error(`Expected Field,Value headers in ${experienceCsvPath}.`);
  }
  if (records.length !== Object.keys(fieldNames).length) {
    throw new Error(
      `Expected ${Object.keys(fieldNames).length} field rows in ${experienceCsvPath}; ` +
      `found ${records.length}.`,
    );
  }

  const data: Partial<ExperienceData> = {};
  for (const record of records) {
    const [fieldValue, value] = record;
    if (record.length !== 2 || fieldValue === undefined || value === undefined) {
      throw new Error(`Every CSV field row must contain a Field and Value in ${experienceCsvPath}.`);
    }
    const fieldEntry = Object.entries(fieldNames)
      .find(([fieldName]) => fieldName === fieldValue.trim());
    if (!fieldEntry) {
      throw new Error(`Unknown experience field "${fieldValue}" in ${experienceCsvPath}.`);
    }
    const column = fieldEntry[1];
    if (column in data) {
      throw new Error(`Duplicate experience field "${fieldValue}" in ${experienceCsvPath}.`);
    }
    data[column] = value;
  }

  if (!isCompleteExperienceData(data)) {
    const missingFields = Object.values(fieldNames).filter((column) => !(column in data));
    throw new Error(`Missing CSV field rows: ${missingFields.join(', ')}.`);
  }
  if (!data.title?.trim()) {
    throw new Error(
      'Enter a title in testdata/localite/create-experience.csv before running Create Experience.',
    );
  }
  return data;
}

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
