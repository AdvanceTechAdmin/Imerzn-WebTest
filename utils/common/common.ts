import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

/** Escape text so it can be used literally inside a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Type into a location autocomplete input, click the exact matching suggestion,
 * and confirm the input accepted it.
 */
export async function selectLocationSuggestion(
  page: Page,
  input: Locator,
  value: string,
): Promise<void> {
  await input.fill(value);

  const suggestion = page.getByText(value, { exact: true });
  await expect(suggestion).toBeVisible();
  // Picking a suggestion makes the page fetch the place details (latitude/longitude) from Google.
  // Submitting before they arrive saves the form without coordinates (the server rejects it with
  // HTTP 500), so wait for that response. Forms that do not fetch details just continue.
  const placeDetails = page
    .waitForResponse((response) => /Places\/GetPlace/.test(response.url()), { timeout: 15_000 })
    .catch(() => undefined);
  await suggestion.click();
  await placeDetails;
  // Give the page a moment to store the coordinates from the response.
  await page.waitForTimeout(500);

  await expect(input).toHaveValue(value);
}

/**
 * Stop the newsletter popup ("Travel deeper. Stories, Not Stops®") and the cookie banner from
 * appearing, and close them automatically if they still do.
 * Call once per test, before the first navigation; no need to check for the popup after each step.
 */
export async function autoCloseNewsletterPopup(page: Page): Promise<void> {
  // Prevent both overlays: before any page script runs, store what the site saves after a visitor
  // submits the newsletter popup and rejects optional cookies. The site then never shows them,
  // so they cannot appear mid-click and swallow a test's click.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('imerzn:lead_popup_submitted', 'true');
      if (!window.localStorage.getItem('imerzn_consent_v1')) {
        window.localStorage.setItem('imerzn_consent_v1', JSON.stringify({
          ts: Date.now(),
          choices: { analytics: false, ads: false, personalization: false },
          version: 1,
        }));
      }
    } catch {
      // Storage unavailable; the handlers below still close the overlays.
    }
  });

  // Backup in case the site changes those keys: close the overlays whenever they appear.
  // Cookie preferences banner (its X counts as "Reject all").
  const cookieBannerClose = page.getByRole('button', { name: /^Close cookie banner/ });
  const cookieRejectAll = page.getByRole('button', { name: 'Reject all', exact: true });
  // Newsletter dialog "Travel deeper. Stories, Not Stops®".
  const newsletterDialog = page.getByRole('dialog', { name: /Travel deeper\. Stories, Not Stops/ });

  // Overlays can cover each other's buttons and handlers do not run inside other handlers,
  // so each handler closes both. These are dismiss-only overlays, not part of the flow under test.
  // dispatchEvent('click') fires the button's click handler directly, so it works even while the
  // overlay is animating or partly covered (a mouse click can wait or land on the wrong element).
  const closeOverlays = async (): Promise<void> => {
    if (await cookieBannerClose.isVisible()) {
      await cookieRejectAll.dispatchEvent('click', undefined, { timeout: 5_000 }).catch(() => {});
    }
    if (await newsletterDialog.isVisible()) {
      await newsletterDialog
        .getByRole('button', { name: 'Close popup' })
        .dispatchEvent('click', undefined, { timeout: 5_000 })
        .catch(() => {});
      // Fall back to Escape if the dialog is still open.
      await newsletterDialog
        .waitFor({ state: 'hidden', timeout: 3_000 })
        .catch(() => page.keyboard.press('Escape'));
    }
  };

  // noWaitAfter: if the banner is slow to close, do not block the test; the handler runs again later.
  await page.addLocatorHandler(cookieBannerClose, closeOverlays, { noWaitAfter: true });
  await page.addLocatorHandler(newsletterDialog, closeOverlays);
}

/**
 * Close the newsletter popup if it appears.
 */
export async function closeNewsletterPopupIfVisible(
  page: Page,
): Promise<void> {
  const closeButton = page.getByRole('button', {
    name: 'Close popup',
  });

  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
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

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (!quoted && row.length === 0 && field === '' && character === '#') {
      while (index < csv.length && csv[index] !== '\n' && csv[index] !== '\r') {
        index += 1;
      }
    } else if (character === '"' && quoted && csv[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
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
  if (headers?.[0]?.trim().toLowerCase() !== 'field' ||
      headers[1]?.trim().toLowerCase() !== 'value') {
    throw new Error(`Expected Field,Value headers in ${path}.`);
  }

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
 * Run a named test step: logs it to the terminal, shows it in the HTML report and trace,
 * and prefixes any failure with the step name.
 */
export async function step<T>(title: string, action: () => Promise<T>): Promise<T> {
  return test.step(title, async () => {
    console.info(`[STEP] ${title}`);
    try {
      return await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[FAILED] ${title}: ${message}`);
      throw new Error(`Step "${title}" failed: ${message}`, { cause: error });
    }
  });
}

/** Split a "|"-separated CSV value into trimmed, non-empty items. */
export function splitList(value: string): string[] {
  return value.split('|').map((item) => item.trim()).filter(Boolean);
}
