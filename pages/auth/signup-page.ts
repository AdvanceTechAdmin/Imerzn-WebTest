import { expect, type Locator, type Page } from '@playwright/test';

/** Data required to complete the traveler signup form. */
export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

/** Possible states of the signup page. */
export type SignupPageAvailability = 'ready' | 'maintenance' | 'unavailable';

/**
 * Page Object for the traveler signup flow.
 * Contains signup locators and browser interactions.
 */
export class SignupPage {
  constructor(private readonly page: Page) {}

  /** Maintenance message displayed when the application is unavailable. */
  get maintenanceMessage(): Locator {
    return this.page.getByText(/we'll be right back|be right back/i);
  }

  /** Button displayed on the maintenance screen. */
  get tryAgainButton(): Locator {
    return this.page.getByRole('button', { name: /try again now/i });
  }

  /** Message displayed after signup reaches phone verification. */
  get verificationMessage(): Locator {
    return this.page.getByText(/verify\s+number/i);
  }

  /** Phone input used to verify that the entered number is normalized. */
  get normalizedPhoneInput(): Locator {
    return this.page.locator('input[name="phone"]');
  }

  /** OTP input boxes displayed during phone verification. */
  get otpInputs(): Locator {
    return this.page.locator(
      'input[aria-label^="Please enter OTP character"]',
    );
  }

  /** Verify button for phone-number verification. */
  get verifyButton(): Locator {
    return this.page.getByRole('button', {
      name: 'Verify',
      exact: true,
    });
  }

  /** Profile-picture upload input. */
  get profilePictureInput(): Locator {
    return this.page.locator('#profile-pic');
  }

  /** Submit button for profile creation. */
  get profileSubmitButton(): Locator {
    return this.page.getByRole('button', {
      name: 'Submit',
      exact: true,
    });
  }

  /** Form fields used to determine whether the signup form has loaded. */
  private get formFields(): Locator[] {
    return [
      this.page.getByPlaceholder('Enter name'),
      this.page.getByPlaceholder('Enter last name'),
      this.page.getByPlaceholder('you@company.com'),
      this.page.getByPlaceholder('Enter contact number'),
      this.page.locator('input[name="password"]'),
      this.page.locator('input[name="cpassword"]'),
    ];
  }

  /** Open the signup page. */
  async open(): Promise<void> {
    await this.page.goto('/signup', {
      waitUntil: 'domcontentloaded',
    });
  }

  /** Check whether signup is ready, unavailable, or under maintenance. */
  async availability(): Promise<SignupPageAvailability> {
    const maintenanceVisible = await Promise.all([
      this.maintenanceMessage.isVisible().catch(() => false),
      this.tryAgainButton.isVisible().catch(() => false),
    ]);

    if (maintenanceVisible.some(Boolean)) {
      return 'maintenance';
    }

    const formVisible = await Promise.all(
      this.formFields.map((field) => field.isVisible().catch(() => false)),
    );

    return formVisible.some(Boolean) ? 'ready' : 'unavailable';
  }

  /**
   * Open signup and select Traveler.
   * Return the final form status so the test can decide whether to continue.
   */
  async openTravelerSignup(): Promise<SignupPageAvailability> {
    await this.open();

    const initialAvailability = await this.availability();

    if (initialAvailability !== 'ready') {
      return initialAvailability;
    }

    await this.page
      .getByRole('link', { name: 'Traveler', exact: true })
      .click();

    return this.availability();
  }

  /** Fill in the traveler signup form with the supplied test data. */
  async fillForm(data: SignupFormData): Promise<void> {
    await this.page.getByPlaceholder('Enter name').fill(data.firstName);
    await this.page.getByPlaceholder('Enter last name').fill(data.lastName);
    await this.page.getByPlaceholder('you@company.com').fill(data.email);

    // Enter the phone number character by character for the phone input widget.
    const contactNumber = this.page.getByPlaceholder('Enter contact number');
    await contactNumber.click();
    await contactNumber.fill('');
    await contactNumber.pressSequentially(data.phone, { delay: 50 });

    // Fill and confirm the password.
    await this.page.locator('input[name="password"]').fill(data.password);
    await this.page.locator('input[name="cpassword"]').fill(data.password);

    // Select the signup referral source.
    await this.page
      .getByLabel(/how did you hear about us/i)
      .selectOption({ label: 'Google search' });
  }

  /** Accept the required consent and submit the signup form. */
  async submit(): Promise<void> {
    await this.page.locator('label.checkbox-container').click();
    await this.page.getByRole('button', { name: /^sign up$/i }).click();
  }

  /** Enter the OTP code and verify the phone number. */
  async verifyOTPNumber(otp: string): Promise<void> {
    if (!/^\d{6}$/.test(otp)) {
      throw new Error('OTP must contain exactly 6 digits.');
    }

    await expect(this.otpInputs).toHaveCount(6);

    for (const [index, digit] of [...otp].entries()) {
      await this.otpInputs.nth(index).fill(digit);
    }

    await this.verifyButton.click();
  }

  /** Upload a profile picture. */
  async uploadProfilePicture(imagePath: string): Promise<void> {
    await this.profilePictureInput.setInputFiles(imagePath);
  }
 
/** Save button in the Crop Profile Picture dialog. */
get saveCroppedPictureButton(): Locator {
  return this.page.getByRole('button', {
    name: 'Save',
    exact: true,
  });
}

/** Save the cropped profile picture. */
async saveCroppedProfilePicture(): Promise<void> {
  await this.saveCroppedPictureButton.click();
}

  /** Submit the completed profile. */
  async submitProfile(): Promise<void> {
    await this.profileSubmitButton.click();
  }
}