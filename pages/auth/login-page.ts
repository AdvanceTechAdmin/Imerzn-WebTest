import { expect, type Page } from '@playwright/test';
import { MaintenancePage, SITE_OFFLINE_MESSAGE } from '../components/maintenance-page';

export class LoginPage {
  // Store the browser page so all login actions use the same page.
  constructor(private readonly page: Page) {}

  /**
   * Open the login page using the baseURL configured in playwright.config.ts.
   * Wait until the email field is visible before continuing.
   * Fails with a clear message if the site shows its maintenance page instead.
   */
  async open(): Promise<void> {
    // Wait for the page structure only: third-party scripts can delay the full "load" event,
    // and the email field check below confirms the form is ready.
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Wait for the login form or the maintenance page, whichever appears first.
    // 30s: the first (cold) load of the day can take 8s or more.
    const emailField = this.page.getByPlaceholder('you@company.com');
    const maintenance = new MaintenancePage(this.page);
    await emailField.or(maintenance.message).first().waitFor({ state: 'visible', timeout: 30_000 });
    if (await maintenance.isShown()) {
      throw new Error(SITE_OFFLINE_MESSAGE);
    }
  }

  /**
   * Log in using the provided email and password.
   * Fill in both fields, then click the Log In button.
   */
  async login(email: string, password: string): Promise<void> {
    // Enter the user's email address.
    await this.page
      .getByPlaceholder('you@company.com')
      .fill(email);

    // Enter the user's password.
    await this.page
      .getByPlaceholder('Please enter your password')
      .fill(password);

    // Find the Log In button by its accessible name.
    const loginButton = this.page.getByRole('button', {
      name: 'Log In',
      exact: true,
    });

    // Ensure the button is enabled before submitting the form.
    await expect(loginButton).toBeEnabled();

    // Submit the login form.
    await loginButton.click();
  }

  /**
   * Locate the login error message displayed by the application.
   * Target the alert title by its text instead of using a dynamic toast ID.
   */
  getLoginErrorMessage() {
    return this.page
      .locator('[data-status="error"] .chakra-alert__title')
      .filter({ hasText: 'Invalid username or password' });
  }
}