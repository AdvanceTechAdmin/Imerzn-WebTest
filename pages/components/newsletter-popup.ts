import type { Page } from '@playwright/test';

/**
 * Stop the newsletter popup ("Travel deeper. Stories, Not Stops®") and the cookie banner from
 * appearing, and close them automatically if they still do.
 * The test fixture (fixtures/test.ts) calls this for every page, before the first navigation.
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
