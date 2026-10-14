import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '../../utils/common';

/** "Save to wishlist" dialog opened by the heart icon on an experience card. */
export class SaveToWishlistDialog {
  constructor(private readonly page: Page) {}

  get dialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Save to wishlist' });
  }

  /** Checkbox for a wishlist; its accessible name is "<name> <n> items". */
  wishlistCheckbox(name: string): Locator {
    return this.dialog.getByRole('checkbox', {
      name: new RegExp(`^${escapeRegExp(name)}\\s+\\d+\\s+items?$`),
    });
  }

  get doneButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Done', exact: true });
  }

  /** Tick the wishlist and click Done. */
  async saveTo(name: string): Promise<void> {
    const checkbox = this.wishlistCheckbox(name);
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await this.doneButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
