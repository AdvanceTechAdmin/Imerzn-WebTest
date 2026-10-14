import { expect, type Locator, type Page } from '@playwright/test';

/** Page Object for the admin Users list (/dashboard/users): role tabs, search, and row actions. */
export class AdminUsersPage {
  constructor(private readonly page: Page) {}

  /** "Users" entry in the admin side navigation. */
  get usersNavLink(): Locator {
    return this.page
      .getByRole('navigation')
      .getByRole('link', { name: 'Users', exact: true });
  }

  /** Role tab in the "Users roles" tab list: All, AFFILIATE, LOCALITE, OPERATOR, TRAVELLER. */
  userRoleTab(name: string): Locator {
    return this.page
      .getByRole('tablist', { name: 'Users roles' })
      .getByRole('tab', { name, exact: true });
  }

  /** "Search name or email..." box above the users table. */
  get searchInput(): Locator {
    return this.page.getByRole('textbox', { name: 'search' });
  }

  /** Users table row whose Email cell matches the given email. */
  userRow(email: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: email, exact: true }) });
  }

  /** Open the Users page from the side navigation. */
  async open(): Promise<void> {
    await this.usersNavLink.click();
    await expect(this.page).toHaveURL(/\/dashboard\/users/);
  }

  async selectUserRole(name: string): Promise<void> {
    const tab = this.userRoleTab(name);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  async searchUser(email: string): Promise<void> {
    await this.searchInput.fill(email);
    await this.searchInput.press('Enter');
    await expect(this.userRow(email)).toBeVisible({ timeout: 30_000 });
  }

  /** Open the row's three-dots menu and choose an action such as View. */
  async openRowAction(email: string, action: string): Promise<void> {
    await this.userRow(email).getByRole('button').last().click();
    await this.page.getByRole('menuitem', { name: action, exact: true }).click();
  }
}
