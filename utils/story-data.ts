import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFieldValueCsv } from './common';

const storyCsvPath = resolve(process.cwd(), 'testdata', 'traveler', 'story.csv');

/** Values entered on the story form. */
export interface StoryFormData {
  title: string;
  location: string;
  description: string;
}

/** Story to create, the image to upload, and the values to change on edit. */
export interface StoryData {
  created: StoryFormData;
  updated: StoryFormData;
  imagePath: string;
}

/** Read story.csv. Created and updated titles share the same 6 random digits. */
export async function readStoryData(): Promise<StoryData> {
  const data = await readFieldValueCsv(storyCsvPath);

  const getValue = (field: string): string => {
    const value = data.get(field);
    if (!value) {
      throw new Error(`Set "${field}" in ${storyCsvPath}.`);
    }
    return value;
  };

  const imagePath = resolve(process.cwd(), getValue('Image'));
  if (!existsSync(imagePath)) {
    throw new Error(`Story image does not exist: ${imagePath}`);
  }

  const suffix = randomInt(100_000, 1_000_000);
  const location = getValue('Location');
  return {
    created: {
      title: `${getValue('Title Prefix')} ${suffix}`,
      location,
      description: getValue('Description'),
    },
    updated: {
      title: `${getValue('Updated Title Prefix')} ${suffix}`,
      location,
      description: getValue('Updated Description'),
    },
    imagePath,
  };
}
