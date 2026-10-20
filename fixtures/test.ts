import { test as base, type Page } from '@playwright/test';
import { AdminLoginPage } from '@pages/admin/admin-login-page';
import { AdminUserDetailPage } from '@pages/admin/admin-user-detail-page';
import { AdminUsersPage } from '@pages/admin/admin-users-page';
import { LoginPage } from '@pages/auth/login-page';
import { SignupPage } from '@pages/auth/signup-page';
import { SettingsPage } from '@pages/common/settings-page';
import { MaintenancePage, SITE_OFFLINE_MESSAGE } from '@pages/components/maintenance-page';
import { autoCloseNewsletterPopup } from '@pages/components/newsletter-popup';
import { ProfileMenu } from '@pages/components/profile-menu';
import { CreateExperiencePage } from '@pages/localite/create-experience-page';
import { CreateGalleryPage } from '@pages/localite/create-gallery-page';
import { CreateGuideProfilePage } from '@pages/localite/create-guide-profile-page';
import { EditProfilePage } from '@pages/localite/edit-profile-page';
import { FindTouristGuidePage } from '@pages/localite/find-tourist-guide-page';
import { GuideProfilePage } from '@pages/localite/guide-profile-page';
import { LocaliteBookingsPage } from '@pages/localite/localite-bookings-page';
import { LocaliteTransactionsPage } from '@pages/localite/localite-transactions-page';
import { PreviewProfilePage } from '@pages/localite/preview-profile-page';
import { ReferralPage } from '@pages/localite/referral-page';
import { BookExperienceDialog } from '@pages/traveler/book-experience-dialog';
import { DashboardPage } from '@pages/traveler/dashboard-page';
import { ExperienceDetailsPage } from '@pages/traveler/experience-details-page';
import { LocalitesPage } from '@pages/traveler/localites-page';
import { MyBookingsPage } from '@pages/traveler/my-bookings-page';
import { PaymentDialog } from '@pages/traveler/payment-dialog';
import { StoriesPage } from '@pages/traveler/stories-page';
import { TransactionsPage } from '@pages/traveler/transactions-page';
import { WishlistPage } from '@pages/traveler/wishlist-page';
import { getLocaliteAccount, type LocaliteAccount } from '@data/state/created-localite';
import { getTravelerAccount, type TravelerAccount } from '@data/state/created-traveler';
import { Session } from './session';

/** Page objects a test can ask for by name, e.g. async ({ loginPage, profileMenu }) => ... */
interface PageObjects {
  // Admin portal
  adminLoginPage: AdminLoginPage;
  adminUsersPage: AdminUsersPage;
  adminUserDetailPage: AdminUserDetailPage;
  // Login and signup
  loginPage: LoginPage;
  signupPage: SignupPage;
  // Shared by both roles
  profileMenu: ProfileMenu;
  settingsPage: SettingsPage;
  dashboardPage: DashboardPage;
  experiencesPage: FindTouristGuidePage;
  experienceDetailsPage: ExperienceDetailsPage;
  // Localite
  createGuideProfilePage: CreateGuideProfilePage;
  guideProfilePage: GuideProfilePage;
  editProfilePage: EditProfilePage;
  previewProfilePage: PreviewProfilePage;
  createExperiencePage: CreateExperiencePage;
  createGalleryPage: CreateGalleryPage;
  localiteBookingsPage: LocaliteBookingsPage;
  localiteTransactionsPage: LocaliteTransactionsPage;
  referralPage: ReferralPage;
  // Traveler
  localitesPage: LocalitesPage;
  bookingDialog: BookExperienceDialog;
  paymentDialog: PaymentDialog;
  myBookingsPage: MyBookingsPage;
  transactionsPage: TransactionsPage;
  storiesPage: StoriesPage;
  wishlistPage: WishlistPage;
}

/** Accounts and signing in. */
interface AccountFixtures {
  /** Signs the page in and out (reuses saved logins; see fixtures/session.ts). */
  session: Session;
  /** The localite created by LOC-001 (or the auth.csv Login account), with any Edit Profile changes. */
  localite: LocaliteAccount;
  /** The traveler created by AUTH-003, with any Settings changes. */
  traveler: TravelerAccount;
}

/** Fixture that builds a page object for the test's page. */
function pageObject<T>(PageObject: new (page: Page) => T) {
  return async ({ page }: { page: Page }, use: (value: T) => Promise<void>): Promise<void> => {
    await use(new PageObject(page));
  };
}

/**
 * The test function every spec imports instead of @playwright/test's.
 * It adds the page objects and accounts above, and two things every test gets automatically:
 * - the newsletter popup and cookie banner are kept from covering the page;
 * - if a test fails while the site shows its maintenance page, the failure is marked "Site offline".
 */
export const test = base.extend<PageObjects & AccountFixtures>({
  // Every test's page: overlays handled before the first navigation, maintenance checked at the end.
  page: async ({ page }, use, testInfo) => {
    await autoCloseNewsletterPopup(page);
    await use(page);

    // A failure caused by a deploy in progress gets a clear note in the report and the CI log.
    if (testInfo.status !== testInfo.expectedStatus && await new MaintenancePage(page).isShown()) {
      testInfo.annotations.push({ type: 'Site offline', description: SITE_OFFLINE_MESSAGE });
      console.error(`[SITE OFFLINE] ${testInfo.title}: ${SITE_OFFLINE_MESSAGE}`);
    }
  },

  // Signing in, and the accounts saved by the setup tests (read when a test asks for them).
  session: async ({ page }, use) => {
    await use(new Session(page));
  },
  localite: async ({}, use) => {
    await use(await getLocaliteAccount());
  },
  traveler: async ({}, use) => {
    await use(await getTravelerAccount());
  },

  // Page objects (created only when a test asks for them).
  adminLoginPage: pageObject(AdminLoginPage),
  adminUsersPage: pageObject(AdminUsersPage),
  adminUserDetailPage: pageObject(AdminUserDetailPage),
  loginPage: pageObject(LoginPage),
  signupPage: pageObject(SignupPage),
  profileMenu: pageObject(ProfileMenu),
  settingsPage: pageObject(SettingsPage),
  dashboardPage: pageObject(DashboardPage),
  experiencesPage: pageObject(FindTouristGuidePage),
  experienceDetailsPage: pageObject(ExperienceDetailsPage),
  createGuideProfilePage: pageObject(CreateGuideProfilePage),
  guideProfilePage: pageObject(GuideProfilePage),
  editProfilePage: pageObject(EditProfilePage),
  previewProfilePage: pageObject(PreviewProfilePage),
  createExperiencePage: pageObject(CreateExperiencePage),
  createGalleryPage: pageObject(CreateGalleryPage),
  localiteBookingsPage: pageObject(LocaliteBookingsPage),
  localiteTransactionsPage: pageObject(LocaliteTransactionsPage),
  referralPage: pageObject(ReferralPage),
  localitesPage: pageObject(LocalitesPage),
  bookingDialog: pageObject(BookExperienceDialog),
  paymentDialog: pageObject(PaymentDialog),
  myBookingsPage: pageObject(MyBookingsPage),
  transactionsPage: pageObject(TransactionsPage),
  storiesPage: pageObject(StoriesPage),
  wishlistPage: pageObject(WishlistPage),
});

export { expect } from '@playwright/test';
