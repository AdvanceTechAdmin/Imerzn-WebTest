import { expect, type Locator, type Page } from '@playwright/test';
import type { BookingData } from '../../utils/traveler/booking-data';
import { readPriceBreakdown, type PriceBreakdown } from '../components/price-breakdown';

/** "Payment" dialog shown after Book; card fields are Stripe secure iframes. */
export class PaymentDialog {
  constructor(private readonly page: Page) {}

  get dialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Payment' }),
    });
  }

  get payButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Pay', exact: true });
  }

  private stripeField(frameTitle: string, inputName: string): Locator {
    return this.dialog.frameLocator(`iframe[title="${frameTitle}"]`).locator(`input[name="${inputName}"]`);
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 30_000 });
  }

  async readPrices(): Promise<PriceBreakdown> {
    return readPriceBreakdown(this.dialog);
  }

  /** Type the card details (Stripe fields need key presses, not fill). */
  async fillCard(card: BookingData['card']): Promise<void> {
    await this.typeStripeField('Secure card number input frame', 'cardnumber', card.number);
    await this.typeStripeField('Secure expiration date input frame', 'exp-date', card.expiry.replace('/', ''));
    await this.typeStripeField('Secure CVC input frame', 'cvc', card.cvv);
  }

  /**
   * Type into a Stripe field and confirm it holds the digits. Stripe's secure frames sometimes
   * accept keystrokes late or drop them, so clear and retype until the value is right.
   */
  private async typeStripeField(frameTitle: string, inputName: string, digits: string): Promise<void> {
    const input = this.stripeField(frameTitle, inputName);
    await expect(input).toBeVisible({ timeout: 30_000 });
    await expect(async () => {
      await input.click({ timeout: 5_000 });
      await input.press('Control+A');
      await input.press('Backspace');
      await input.pressSequentially(digits, { delay: 50, timeout: 10_000 });
      // Stripe formats the value (e.g. "4111 1111 1111 1111", "11 / 30"); compare digits only.
      expect((await input.inputValue()).replace(/\D/g, '')).toBe(digits);
    }).toPass({ timeout: 45_000 });
  }

  /**
   * Fill the billing address. Choosing the Location makes the page fill in Country/State/City
   * a moment later and, at the same time, reset Address Line and Zip. So: choose the Location,
   * wait for that reset (Address Line gets filled by the page), then type the other fields and
   * re-check after a short pause that they were not reset again.
   */
  async fillBilling(billing: BookingData['billing']): Promise<void> {
    const location = this.dialog.getByPlaceholder('Enter city, state ...');
    const fullName = this.dialog.getByPlaceholder('Enter Full name');
    const address = this.dialog.getByPlaceholder('Enter address line');
    const zip = this.dialog.getByPlaceholder('Enter pincode');

    await location.fill(billing.location);
    await this.dialog.getByText(billing.location, { exact: true }).first().click();
    await expect(location).toHaveValue(billing.location);
    // The page's reset puts the city into Address Line; wait for it before typing.
    await expect(address).not.toHaveValue('', { timeout: 15_000 });

    const fields = [
      [fullName, billing.fullName],
      [address, billing.address],
      [zip, billing.zip],
    ] as const;
    await expect(async () => {
      for (const [input, value] of fields) {
        if ((await input.inputValue()) !== value) {
          await input.fill(value);
        }
      }
      await this.page.waitForTimeout(1_000);
      for (const [input, value] of fields) {
        await expect(input).toHaveValue(value, { timeout: 1_000 });
      }
    }).toPass({ timeout: 20_000 });
  }

  /** Close the Payment dialog without paying (the booking stays pending). */
  async cancel(): Promise<void> {
    await this.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(this.dialog).toBeHidden();
  }

  /** Click Pay and verify the success message and the Transactions page. */
  async payAndVerify(): Promise<void> {
    await expect(this.payButton).toBeEnabled();
    await this.payButton.click();
    await expect(this.page.getByText(/Payment completed successfully/i)).toBeVisible({ timeout: 60_000 });
    await expect(this.page).toHaveURL(/\/dashboard\/transactions/, { timeout: 30_000 });
  }
}
