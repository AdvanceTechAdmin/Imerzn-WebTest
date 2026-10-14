import { expect, type Locator, type Page } from '@playwright/test';

/** Admin portal URL; override with ADMIN_BASE_URL for other environments. */
export const adminBaseUrl = process.env.ADMIN_BASE_URL ?? 'https://dev.admin.imerzn.com';

/** Page Object for the Imerzn Admin sign-in page. */
export class AdminLoginPage {
  constructor(private readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Sign in to Imerzn Admin' });
  }

  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Email' });
  }

  get passwordInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login', exact: true });
  }

  /** Error alert shown when the credentials are rejected. */
  get errorAlert(): Locator {
    return this.page.getByRole('alert');
  }

  async open(): Promise<void> {
    await this.page.goto(`${adminBaseUrl}/login`);
    await expect(this.heading).toBeVisible();
  }

  /** Sign in and wait until the app leaves the login page. */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();

    await expect(
      this.page,
      'Admin login did not succeed; check "Admin Email" / "Admin Password" in testdata/common/auth.csv.',
    ).not.toHaveURL(/\/login\/?$/, { timeout: 30_000 });
  }
}
