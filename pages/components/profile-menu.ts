import { expect, type Locator, type Page } from '@playwright/test';

/** Profile menu opened from the profile image at the top right of the header. */
export class ProfileMenu {
  constructor(private readonly page: Page) {}

  get profileImage(): Locator {
    return this.page.getByRole('banner').getByRole('img', { name: 'Profile' });
  }

  get wishlistLink(): Locator {
    return this.page.getByRole('banner').getByRole('link', { name: 'Wishlist', exact: true });
  }

  /** "Dashboard" link in the header, shown only when logged in. */
  get dashboardLink(): Locator {
    return this.page.getByRole('banner').getByRole('link', { name: 'Dashboard', exact: true });
  }

  get settingsLink(): Locator {
    return this.page.getByRole('banner').getByRole('link', { name: 'Settings', exact: true });
  }

  get logOutButton(): Locator {
    return this.page.getByRole('banner').getByRole('button', { name: 'Log out', exact: true });
  }

  /** Greeting next to the profile image, e.g. "Hello, First Last". */
  greeting(firstName: string, lastName: string): Locator {
    return this.page.getByRole('banner').getByText(`Hello, ${firstName} ${lastName}`, { exact: true });
  }

  /** Open the profile menu and go to Settings. */
  async openSettings(): Promise<void> {
    await this.profileImage.click();
    await this.settingsLink.click();
    await expect(this.page).toHaveURL(/\/dashboard\/settings/);
  }

  /** "Settings" in the left sidebar of dashboard pages (/dashboard/...). */
  get dashboardSettingsLink(): Locator {
    return this.page.getByRole('main').getByRole('link', { name: 'Settings', exact: true });
  }

  /** Header Dashboard link, then Settings in the dashboard sidebar. */
  async openSettingsFromDashboard(): Promise<void> {
    await this.dashboardLink.click();
    await expect(this.page).toHaveURL(/\/dashboard\/?$/);
    await this.dashboardSettingsLink.click();
    await expect(this.page).toHaveURL(/\/dashboard\/settings/);
  }

  /** "Log out" in the left sidebar of dashboard pages (/dashboard/...). */
  get dashboardLogOutLink(): Locator {
    return this.page.getByRole('main').getByRole('link', { name: 'Log out', exact: true });
  }

  /** Question in the log-out confirmation popup (not marked up as a dialog). */
  get logOutConfirmQuestion(): Locator {
    return this.page.getByText('Are you sure you want to log out?', { exact: true });
  }

  /**
   * "Logout" button in the confirmation popup ("Not now" cancels).
   * The popup is marked aria-hidden, so role-based locators cannot see it; match by text.
   */
  get logOutConfirmButton(): Locator {
    return this.page.locator('button').getByText('Logout', { exact: true });
  }

  /** Shown once logged out: the header Login link or the login form. */
  get loggedOutIndicator(): Locator {
    return this.page
      .getByRole('banner')
      .getByRole('link', { name: 'Login', exact: true })
      .or(this.page.getByPlaceholder('Please enter your password'));
  }

  /**
   * Log out. Dashboard pages use a different header, so use the sidebar Log out there;
   * elsewhere open the profile menu.
   */
  async logOut(): Promise<void> {
    if (/\/dashboard/.test(new URL(this.page.url()).pathname)) {
      await this.dashboardLogOutLink.click();
    } else {
      await this.profileImage.click();
      await this.logOutButton.click();
    }

    // Confirm "Are you sure you want to log out?".
    await expect(this.logOutConfirmQuestion).toBeVisible();
    await this.logOutConfirmButton.click();
    await expect(this.loggedOutIndicator.first()).toBeVisible({ timeout: 30_000 });
  }

  /** Open the profile menu and go to Wishlist. */
  async openWishlist(): Promise<void> {
    await this.profileImage.click();
    await this.wishlistLink.click();
    await expect(this.page).toHaveURL(/\/dashboard\/wishlist/);
  }
}
