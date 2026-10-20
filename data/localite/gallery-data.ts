import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCsv } from '@data/csv-loader';
import { randomSixDigits, splitList } from '@helpers/text';

/** Data required to fill the Create Gallery form (testdata/localite/create-gallery.csv). */
export interface GalleryData {
  title: string;
  location: string;
  description: string;
  primaryImagePath: string;
  additionalMediaPaths: string[];
}

/**
 * Read create-gallery.csv.
 * The title is "<Title Prefix> <6 random digits>" so every run creates a unique gallery.
 */
export async function readGalleryData(): Promise<GalleryData> {
  const csv = await loadCsv('localite', 'create-gallery.csv');

  // Additional Media may be empty; each listed file must exist, so a bad path fails before the form.
  const additionalMediaPaths = splitList(csv.present('Additional Media')).map((path) => {
    const filePath = resolve(process.cwd(), path);
    if (!existsSync(filePath)) {
      throw new Error(`Gallery media file does not exist: ${filePath}`);
    }
    return filePath;
  });

  return {
    title: `${csv.required('Title Prefix')} ${randomSixDigits()}`,
    location: csv.present('Location'),
    description: csv.required('Description'),
    primaryImagePath: csv.existingFile('Primary Image'),
    additionalMediaPaths,
  };
}
