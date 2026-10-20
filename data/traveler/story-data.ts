import { loadCsv } from '@data/csv-loader';
import { randomSixDigits } from '@helpers/text';

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

/** Read testdata/traveler/story.csv. Created and updated titles share the same 6 random digits. */
export async function readStoryData(): Promise<StoryData> {
  const csv = await loadCsv('traveler', 'story.csv');
  const suffix = randomSixDigits();
  const location = csv.required('Location');

  return {
    created: {
      title: `${csv.required('Title Prefix')} ${suffix}`,
      location,
      description: csv.required('Description'),
    },
    updated: {
      title: `${csv.required('Updated Title Prefix')} ${suffix}`,
      location,
      description: csv.required('Updated Description'),
    },
    imagePath: csv.existingFile('Image'),
  };
}
