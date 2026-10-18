import { expect, type Locator, type Page } from '@playwright/test';

/** One row of the Referral History table. */
export interface ReferralHistoryRow {
  referredLocalite: string;
  referralPercent: string;
  totalEarned: string;
  withdrawable: string;
  status: string;
}

/** Page Object for the localite's Referral page (/guide_referral_page/<id>), opened from the profile menu. */
export class ReferralPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  get heading(): Locator {
    return this.main.getByRole('heading', { name: 'Invite Friends & Earn Rewards', exact: true });
  }

  /** Read-only box showing the localite's referral code. */
  get referralCodeInput(): Locator {
    return this.main.getByText('Referral Code', { exact: true }).locator('xpath=following::input[1]');
  }

  get historyHeading(): Locator {
    return this.main.getByRole('heading', { name: 'Referral History', exact: true });
  }

  /** Referral History row for a referred localite. Columns: Referred Localite, Referral %, Total Earned, Withdrawable, Status. */
  historyRow(referredLocalite: string): Locator {
    return this.main.getByRole('row').filter({ has: this.page.getByRole('cell', { name: referredLocalite, exact: true }) });
  }

  async expectLoaded(referralCode: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/guide_referral_page\//);
    await expect(this.heading).toBeVisible();
    await expect(this.referralCodeInput).toHaveValue(referralCode);
    await expect(this.historyHeading).toBeVisible();
  }

  /** Read the Referral History row of a referred localite. */
  async readHistoryRow(referredLocalite: string): Promise<ReferralHistoryRow> {
    const row = this.historyRow(referredLocalite);
    await expect(row).toHaveCount(1, { timeout: 30_000 });
    const [name, referralPercent, totalEarned, withdrawableCell, status] = (await row.getByRole('cell').allInnerTexts())
      .map((text) => text.trim());
    // The Withdrawable cell also holds the Withdraw button when there is money to withdraw.
    const withdrawable = withdrawableCell.replace(/\s*Withdraw\s*$/, '').trim();
    return { referredLocalite: name, referralPercent, totalEarned, withdrawable, status };
  }

  /** "Withdraw" button in a row's Withdrawable cell; shown only when the amount is above $0. */
  withdrawButton(referredLocalite: string): Locator {
    return this.historyRow(referredLocalite).getByRole('button', { name: 'Withdraw', exact: true });
  }

  get withdrawDialog(): Locator {
    return this.page.locator('[role="dialog"]').filter({ hasText: 'Withdraw Payment' });
  }

  /** Error shown on Submit when an earlier withdrawal for this referral has not been processed yet. */
  get pendingWithdrawalError(): Locator {
    return this.page.getByText('You already have a pending withdrawal request for this referral').first();
  }

  /**
   * Click Withdraw, check the prefilled amount, and Submit. Returns the amount and whether the site
   * refused it because a withdrawal request is already pending (the dialog is closed either way).
   */
  async withdraw(referredLocalite: string, expectedAmount: number): Promise<{ amount: number; alreadyPending: boolean }> {
    await this.withdrawButton(referredLocalite).click();
    await expect(this.withdrawDialog).toBeVisible();
    const amountInput = this.withdrawDialog.locator('input[name="amount"]');
    await expect(amountInput).not.toHaveValue('');
    const amount = toAmount(await amountInput.inputValue());
    expect(amount, 'Withdraw Payment amount = Withdrawable').toBe(expectedAmount);
    await this.withdrawDialog.locator('button', { hasText: /^\s*Submit\s*$/ }).click();

    // Either the request is accepted (the dialog closes) or the pending-request error appears.
    await expect(async () => {
      const errorShown = await this.pendingWithdrawalError.isVisible();
      const dialogOpen = await this.withdrawDialog.isVisible();
      expect(errorShown || !dialogOpen, 'Withdraw dialog closes or the pending-request error appears').toBe(true);
    }).toPass({ timeout: 30_000 });
    // The error can appear just after the dialog closes.
    const alreadyPending = await this.pendingWithdrawalError.waitFor({ timeout: 2_000 }).then(() => true, () => false);
    if (await this.withdrawDialog.isVisible()) {
      await this.withdrawDialog.locator('button.btn-close').click();
    }
    await expect(this.withdrawDialog).toBeHidden();
    if (alreadyPending) {
      // The error notification stays on screen over the header; close it.
      await this.pendingWithdrawalToast.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(this.pendingWithdrawalToast).toBeHidden();
    }
    return { amount, alreadyPending };
  }

  /** Notification (top right) holding the pending-request error and its Close button. */
  get pendingWithdrawalToast(): Locator {
    return this.page.getByRole('status').filter({ hasText: 'You already have a pending withdrawal request for this referral' });
  }
}

/** "$1,234.50" or "8" -> 1234.5 / 8. */
export function toAmount(text: string): number {
  return Number(text.replace(/[$,\s]/g, ''));
}
