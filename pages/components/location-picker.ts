import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Type into a location autocomplete input, click the exact matching suggestion,
 * and confirm the input accepted it.
 */
export async function selectLocationSuggestion(
  page: Page,
  input: Locator,
  value: string,
): Promise<void> {
  // Type the location and wait for the matching suggestion.
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
