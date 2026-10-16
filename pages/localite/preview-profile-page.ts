import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '../../utils/common/common';
import { ProfileSharingDialog } from '../components/profile-sharing-dialog';

/** Page Object for a localite's Preview Profile page (/preview-profile/<slug>). */
export class PreviewProfilePage {
  /** Profile Sharing dialog opened by Share Profile. */
  readonly shareDialog: ProfileSharingDialog;

  constructor(private readonly page: Page) {
    this.shareDialog = new ProfileSharingDialog(page);
  }

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  /** Profile name heading, e.g. "First Last (Business Name)". */
  nameHeading(firstName: string, lastName: string): Locator {
    return this.main.getByRole('heading', {
      level: 4,
      name: new RegExp(`^${escapeRegExp(`${firstName} ${lastName}`)}`),
    });
  }

  /** Bio paragraph on the preview page. */
  bioText(bio: string): Locator {
    return this.main.getByText(bio, { exact: true });
  }

  /** Experience card title link. */
  experienceLink(title: string): Locator {
    return this.main.getByRole('link', { name: title, exact: true });
  }

  /** Gallery card title link. */
  galleryLink(title: string): Locator {
    return this.main.getByRole('link', { name: title, exact: true });
  }

  get followButton(): Locator {
    return this.main.getByRole('button', { name: 'Follow', exact: true });
  }

  get followingButton(): Locator {
    return this.main.getByRole('button', { name: 'Following', exact: true });
  }

  get shareProfileButton(): Locator {
    return this.main.getByRole('button', { name: 'Share Profile', exact: true });
  }

  get backLink(): Locator {
    return this.main.getByRole('link', { name: 'Back', exact: true });
  }

  /** Verify name, bio, experience, and gallery are shown on the preview. */
  async verifyProfileDetails(expected: {
    firstName: string;
    lastName: string;
    bio: string;
    experienceTitle: string;
    galleryTitle: string;
  }): Promise<void> {
    await expect(this.nameHeading(expected.firstName, expected.lastName)).toBeVisible();
    await expect(this.bioText(expected.bio)).toBeVisible();
    await expect(this.experienceLink(expected.experienceTitle)).toBeVisible();
    await expect(this.galleryLink(expected.galleryTitle)).toBeVisible();
  }

  /**
   * Click Follow and verify it changes to Following.
   * If the profile is already followed from a previous run, unfollow first.
   */
  async followAndVerify(): Promise<void> {
    await expect(this.followButton.or(this.followingButton)).toBeVisible();

    if (await this.followingButton.isVisible()) {
      await this.followingButton.click();
      await expect(this.followButton).toBeVisible();
    }

    await this.followButton.click();
    await expect(this.followingButton).toBeVisible();
  }

  /** Open Profile Sharing and verify the dialog shows the localite's name and bio. */
  async openShareDialogAndVerify(firstName: string, lastName: string, bio: string): Promise<void> {
    await this.shareProfileButton.click();
    await this.shareDialog.verifyDetails(firstName, lastName, bio);
  }

  async closeShareDialog(): Promise<void> {
    await this.shareDialog.close();
  }
}
