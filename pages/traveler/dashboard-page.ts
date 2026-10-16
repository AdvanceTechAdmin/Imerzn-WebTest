import { expect, type Locator, type Page } from '@playwright/test';

/** Sidebar sections of the traveler dashboard and their URLs. */
export const dashboardSections = {
  Dashboard: /\/dashboard\/?$/,
  // Travelers: /dashboard/my-bookings; localites: /dashboard/booking.
  'My Bookings': /\/dashboard\/(my-bookings|booking)/,
  Transactions: /\/dashboard\/transactions/,
  Notifications: /\/dashboard\/notification/,
  Messages: /\/dashboard\/messages/,
} as const;

export type DashboardSection = keyof typeof dashboardSections;

/** Page Object for the traveler dashboard (/dashboard) and its sidebar sections. */
export class DashboardPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  /** "Total Trips" card content: the heading and the number next to it ("Total Trips" + "2"). */
  get totalTripsCard(): Locator {
    return this.main.getByRole('heading', { name: 'Total Trips', exact: true }).locator('xpath=..');
  }

  /** Empty-state heading shown when a section has no data. */
  get noResultsHeading(): Locator {
    return this.main.getByRole('heading', { name: 'No Results Found', exact: true }).first();
  }

  /** Link to a section in the dashboard's left sidebar. */
  sectionLink(section: DashboardSection): Locator {
    return this.main.getByRole('link', { name: section, exact: true });
  }

  async expectOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard\/?$/);
    await expect(this.main.getByRole('heading', { name: 'Total Trips' })).toBeVisible();
  }

  /** Stat box content on the dashboard: its heading and the value next to it (e.g. "Wallet" + "$117.60"). */
  statBox(name: string): Locator {
    return this.main.getByRole('heading', { name, exact: true }).locator('xpath=..');
  }

  /** Verify a dashboard stat shows exactly this value, e.g. ("Bookings", "2") or ("Wallet", "$117.60"). */
  async verifyStat(name: string, value: string): Promise<void> {
    const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(this.statBox(name)).toHaveText(new RegExp(`^\\s*${escape(name)}\\s*${escape(value)}\\s*$`));
  }

  async verifyTotalTrips(count: number): Promise<void> {
    await expect(this.totalTripsCard).toHaveText(new RegExp(`^\\s*Total Trips\\s*${count}\\s*$`));
  }

  /** Open a section from the sidebar and verify it shows "No Results Found". */
  async verifySectionIsEmpty(section: DashboardSection): Promise<void> {
    await this.sectionLink(section).click();
    await expect(this.page).toHaveURL(dashboardSections[section]);
    await expect(this.noResultsHeading).toBeVisible({ timeout: 30_000 });
  }
}
