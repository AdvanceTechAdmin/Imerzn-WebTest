import type { Page } from '@playwright/test';

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