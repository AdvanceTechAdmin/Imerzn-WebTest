import { expect, type Locator, type Page } from '@playwright/test';
import { readPriceBreakdown, type PriceBreakdown } from '../components/price-breakdown';

/** "Book Experience" dialog opened from an experience details page. */
export class BookExperienceDialog {
  constructor(private readonly page: Page) {}

  get dialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Book Experience' }),
    });
  }

  get dateInput(): Locator {
    return this.dialog.getByRole('textbox', { name: 'Select dates' });
  }

  get startTimeSelect(): Locator {
    return this.dialog.getByRole('combobox', { name: 'Start Time' });
  }

  get groupSizeInput(): Locator {
    return this.dialog.getByRole('spinbutton', { name: 'No. of people' });
  }

  get noteInput(): Locator {
    return this.dialog.getByPlaceholder('Give description (100 to 180 words)');
  }

  get bookButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Book', exact: true });
  }

  /** Calendar day, e.g. "Choose Friday, October 16th, 2026". */
  calendarDay(date: Date): Locator {
    const weekday = date.toLocaleString('en-US', { weekday: 'long' });
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();
    const suffix = [11, 12, 13].includes(day % 100) ? 'th' : (['th', 'st', 'nd', 'rd'][day % 10] ?? 'th');
    return this.page.getByRole('option', {
      name: `Choose ${weekday}, ${month} ${day}${suffix}, ${date.getFullYear()}`,
      exact: true,
    });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  /** Open the calendar and pick the date (moving to the next month if needed). */
  async selectDate(date: Date): Promise<void> {
    await this.dateInput.click();
    const day = this.calendarDay(date);
    for (let i = 0; i < 2 && !(await day.isVisible()); i += 1) {
      await this.page.getByRole('button', { name: 'Next Month' }).click();
    }
    await day.click();

    const expected = [date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0'));
    await expect(this.dateInput).toHaveValue(`${expected[0]}-${expected[1]}-${date.getFullYear()}`);
  }

  /** Pick the first available start time and return its label. */
  async selectFirstStartTime(): Promise<string> {
    await expect(this.startTimeSelect.locator('option')).not.toHaveCount(1);
    await this.startTimeSelect.selectOption({ index: 1 });
    return (await this.startTimeSelect.locator('option:checked').textContent())?.trim() ?? '';
  }

  async fillGroupSizeAndNote(groupSize: number, note: string): Promise<void> {
    await this.groupSizeInput.fill(String(groupSize));
    await this.noteInput.fill(note);
    // The price appears once date and group size are set.
    await expect(this.dialog.getByText('Total Amount Due')).toBeVisible();
    await expect(this.dialog.getByText(new RegExp(`Amount \\(${groupSize} (people|person)\\)`))).toBeVisible();
  }

  /** Localite name, traveler name, and location shown at the top of the form. */
  async readFixedDetails(): Promise<{ localiteName: string; travelerName: string; location: string }> {
    const firstName = await this.dialog.getByRole('textbox', { name: 'First name' }).inputValue();
    const lastName = await this.dialog.getByRole('textbox', { name: 'Last name' }).inputValue();
    return {
      localiteName: await this.dialog.getByRole('textbox', { name: 'Localite Name' }).inputValue(),
      travelerName: `${firstName} ${lastName}`.trim(),
      location: await this.dialog.getByRole('textbox', { name: 'Location' }).inputValue(),
    };
  }

  async readPrices(): Promise<PriceBreakdown> {
    return readPriceBreakdown(this.dialog);
  }

  /** Open "Have a promo code or gift code?", enter the code, and apply it. */
  async applyPromoCode(code: string): Promise<void> {
    await this.dialog.getByText('Have a promo code or gift code?').click();
    await this.dialog.getByPlaceholder('Enter promo code').fill(code);
    await this.dialog.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(this.dialog.getByText(`Promo ${code} applied`)).toBeVisible();
  }

  async book(): Promise<void> {
    await this.bookButton.click();
  }

  /** Click Book and verify the site created the booking (its booking request succeeds). */
  async bookAndVerifyCreated(): Promise<void> {
    const bookingResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/traveller/book-experience') &&
        response.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await this.bookButton.click();

    const response = await bookingResponse;
    expect(response.ok(), `Booking request failed with HTTP ${response.status()}`).toBeTruthy();
    const body = await response.json().catch(() => null) as { success?: boolean } | null;
    expect(body?.success, 'Booking request should report success').toBe(true);
  }
}
