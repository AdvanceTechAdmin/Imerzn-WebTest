import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFieldValueCsv } from './common';
import { splitList } from './experience-data';

const galleryCsvPath = resolve(process.cwd(), 'testdata', 'localite', 'create-gallery.csv');

/** Data required to fill the Create Gallery form. */
export interface GalleryData {
  title: string;
  location: string;
  description: string;
  primaryImagePath: string;
  additionalMediaPaths: string[];
}

/**
 * Read gallery data from create-gallery.csv.
 * The title is "<Title Prefix> <6 random digits>" so every run creates a unique gallery.
 */
export async function readGalleryData(): Promise<GalleryData> {
  const data = await readFieldValueCsv(galleryCsvPath);

  const getValue = (field: string): string => {
    const value = data.get(field);
    if (value === undefined) {
      throw new Error(`Missing gallery CSV field "${field}" in ${galleryCsvPath}.`);
    }
    return value;
  };

  const titlePrefix = getValue('Title Prefix');
  const description = getValue('Description');
  if (!titlePrefix || !description) {
    throw new Error(`Title Prefix and Description are required in ${galleryCsvPath}.`);
  }

  // Resolve image paths and fail early if any file is missing.
  const toExistingPath = (path: string): string => {
    const filePath = resolve(process.cwd(), path);
    if (!existsSync(filePath)) {
      throw new Error(`Gallery media file does not exist: ${filePath}`);
    }
    return filePath;
  };

  return {
    title: `${titlePrefix} ${randomInt(100_000, 1_000_000)}`,
    location: getValue('Location'),
    description,
    primaryImagePath: toExistingPath(getValue('Primary Image')),
    additionalMediaPaths: splitList(getValue('Additional Media')).map(toExistingPath),
  };
}
