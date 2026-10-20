import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { splitList } from '@helpers/text';

/** Absolute path of a file under testdata/, e.g. testDataPath('traveler', 'booking.csv'). */
export function testDataPath(...parts: string[]): string {
  return resolve(process.cwd(), 'testdata', ...parts);
}

/**
 * Parse CSV text into rows. Supports quoted fields with commas, escaped quotes (""),
 * and comment lines starting with #. Blank lines are skipped.
 */
export function parseCsv(csv: string, sourcePath: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  // Read character by character so commas and line breaks inside quotes stay part of the field.
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (!quoted && row.length === 0 && field === '' && character === '#') {
      // A # at the start of a row comments out the rest of the line.
      while (index < csv.length && csv[index] !== '\n' && csv[index] !== '\r') {
        index += 1;
      }
    } else if (character === '"' && quoted && csv[index + 1] === '"') {
      // Inside quotes, "" is one literal quote.
      field += '"';
      index += 1;
    } else if (character === '"') {
      // A quote starts or ends a quoted field.
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      // A comma outside quotes ends the field.
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      // A line break outside quotes ends the row (\r\n counts as one break). Blank rows are dropped.
      if (character === '\r' && csv[index + 1] === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.length > 1 || row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  // Keep the last row when the file does not end with a line break.
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row.some((value) => value.trim() !== '')) {
      rows.push(row);
    }
  }
  if (quoted) {
    throw new Error(`Unclosed quoted field in ${sourcePath}.`);
  }
  return rows;
}

/** Read a two-column Field,Value CSV into a Map keyed by trimmed field name. */
export async function readFieldValueCsv(path: string): Promise<Map<string, string>> {
  const [headers, ...records] = parseCsv(await readFile(path, 'utf8'), path);

  // The first row must be the Field,Value header.
  if (headers?.[0]?.trim().toLowerCase() !== 'field' ||
      headers[1]?.trim().toLowerCase() !== 'value') {
    throw new Error(`Expected Field,Value headers in ${path}.`);
  }

  // Every other row is one field; names must be unique.
  const data = new Map<string, string>();
  for (const record of records) {
    const [field, value] = record;
    if (record.length !== 2 || field === undefined || value === undefined) {
      throw new Error(`Every row in ${path} must contain a Field and Value.`);
    }
    const key = field.trim();
    if (data.has(key)) {
      throw new Error(`Duplicate field "${key}" in ${path}.`);
    }
    data.set(key, value.trim());
  }
  return data;
}

/**
 * Typed access to the fields of a Field,Value CSV. Every getter fails with a message naming the
 * field and the file, so a data reader only lists the fields it needs.
 */
export class CsvFields {
  constructor(
    /** Absolute path of the CSV, used in error messages. */
    readonly path: string,
    private readonly data: Map<string, string>,
  ) {}

  /** True if the CSV has a row for the field (its value may be empty). */
  has(field: string): boolean {
    return this.data.has(field);
  }

  /** Value of a field that must be present and not empty. */
  required(field: string): string {
    const value = this.data.get(field);
    if (!value) {
      throw new Error(`Set "${field}" in ${this.path}.`);
    }
    return value;
  }

  /** Value of a field that must have a row, but may be empty. */
  present(field: string): string {
    const value = this.data.get(field);
    if (value === undefined) {
      throw new Error(`Missing field "${field}" in ${this.path}.`);
    }
    return value;
  }

  /** Required field parsed as a number. */
  number(field: string): number {
    const value = Number(this.required(field));
    if (!Number.isFinite(value)) {
      throw new Error(`"${field}" in ${this.path} must be a number.`);
    }
    return value;
  }

  /** Required "|"-separated field as a list of trimmed items. */
  list(field: string): string[] {
    return splitList(this.required(field));
  }

  /** Required field holding a project-relative file path; returns the absolute path of an existing file. */
  existingFile(field: string): string {
    const filePath = resolve(process.cwd(), this.required(field));
    if (!existsSync(filePath)) {
      throw new Error(`"${field}" in ${this.path} points to a missing file: ${filePath}`);
    }
    return filePath;
  }
}

/** Read a Field,Value CSV under testdata/, e.g. loadCsv('traveler', 'booking.csv'). */
export async function loadCsv(...parts: string[]): Promise<CsvFields> {
  const path = testDataPath(...parts);
  return new CsvFields(path, await readFieldValueCsv(path));
}
