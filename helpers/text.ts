import { randomInt } from 'node:crypto';

/** Escape text so it can be used literally inside a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split a "|"-separated CSV value into trimmed, non-empty items. */
export function splitList(value: string): string[] {
  return value.split('|').map((item) => item.trim()).filter(Boolean);
}

/** Random six-digit number (100000-999999), used to make titles and emails unique per run. */
export function randomSixDigits(): number {
  return randomInt(100_000, 1_000_000);
}

/** Random lowercase letters, e.g. "qkzmwp" (for fields that accept letters only). */
export function randomLetters(count: number): string {
  let letters = '';
  for (let i = 0; i < count; i += 1) {
    letters += String.fromCharCode(97 + randomInt(0, 26));
  }
  return letters;
}
