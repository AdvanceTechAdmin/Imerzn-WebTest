import { expect, type Page } from '@playwright/test';

export class LoginPage {
  // Store the browser page so all login actions use the same page.
  constructor(private readonly page: Page) {}

  /**
   * Open the login page using the baseURL configured in playwright.config.ts.
   * Wait until the email field is visible before continuing.
   */
  async open(): Promise<void> {
    await this.page.goto('/login');

    await this.page
      .getByPlaceholder('you@company.com')
      .waitFor({ state: 'visible' });
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