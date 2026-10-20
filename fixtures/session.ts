import { existsSync, mkdirSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { LoginPage } from '@pages/auth/login-page';
import { ProfileMenu } from '@pages/components/profile-menu';

/**
 * Saved logins, one file per account. Git-ignored: the files hold login tokens.
 * CI starts with an empty folder, so each account logs in through the UI once per run.
 */
const sessionDir = resolve(process.cwd(), '.auth');

/** Saved sessions older than this are not reused (the site's tokens may have expired). */
const maxSessionAgeMs = 12 * 60 * 60 * 1000;

/** Email and password of an account the tests sign in with. */
export interface Credentials {
  email: string;
  password: string;
}

/** What is saved after a UI login: the browser storage and the page the site opened after login. */
interface SavedSession {
  email: string;
  savedAt: number;
  /** e.g. the localite's /guide_detailed_page/<name>; restoring a session starts there. */
  landingUrl: string;
  state: Awaited<ReturnType<BrowserContext['storageState']>>;
}

/** localStorage key where the site (redux-persist) keeps its whole app state, including the login. */
const persistRootKey = 'persist:root';

/** Parts of persist:root to restore: the login (auth: user and token) and redux-persist's own entry. */
const loginStateKeys = ['auth', '_persist'];

/**
 * Keep only the login from a saved persist:root. The rest is a snapshot of the app's data at login
 * time (profile, gallery, bookings, ...); restoring an old copy of it crashes some pages (Edit
 * Profile went blank), so the site loads that data fresh, as after a reload while signed in.
 */
function onlyLoginState(persistRoot: string): string {
  const state = JSON.parse(persistRoot) as Record<string, string>;
  return JSON.stringify(Object.fromEntries(
    Object.entries(state).filter(([key]) => loginStateKeys.includes(key)),
  ));
}

/** File holding the saved session of one account. */
function sessionPath(email: string): string {
  return join(sessionDir, `${email.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`);
}

/** Read the saved session of an account, or undefined if there is none or it is too old. */
async function readSession(email: string): Promise<SavedSession | undefined> {
  const path = sessionPath(email);
  if (!existsSync(path)) {
    return undefined;
  }
  const saved = JSON.parse(await readFile(path, 'utf8')) as SavedSession;
  return Date.now() - saved.savedAt < maxSessionAgeMs ? saved : undefined;
}

/**
 * Delete the saved session of an account. Call it when the session stops being valid:
 * after logging out or changing the password.
 */
export async function forgetSession(email: string): Promise<void> {
  await rm(sessionPath(email), { force: true });
}

/**
 * Signs the test's page in as an account.
 *
 * The first time an account is used, it logs in through the login page and saves the session.
 * After that it restores the saved session instead (no login form, no login request), which is
 * faster and avoids the login page, the most common place for a slow-site failure. If a restored
 * session turns out to be logged out, it logs in through the UI again and saves the new session.
 *
 * Tests that are about logging in (AUTH-001/002, the new-password logins) still use LoginPage.
 */
export class Session {
  /** Email of the account this page is signed in as (set by signIn, cleared by signOut). */
  private currentEmail: string | undefined;

  constructor(private readonly page: Page) {}

  /** Shown only when signed in (header or profile page link). */
  private get signedInIndicator(): Locator {
    return this.page.getByRole('link', { name: 'Dashboard' }).first();
  }

  /** Shown only when signed out: the header Login link or the login form. */
  private get signedOutIndicator(): Locator {
    return this.page
      .getByRole('banner').getByRole('link', { name: 'Login', exact: true })
      .or(this.page.getByPlaceholder('Please enter your password'))
      .first();
  }

  /**
   * Sign in as the account and wait until the site shows it signed in.
   * Ends on the page the site opens after login (the localite's profile page, the traveler's home).
   */
  async signIn(account: Credentials): Promise<void> {
    // Reuse the saved session if there is one and it still works.
    const saved = await readSession(account.email);
    if (saved && await this.restore(saved)) {
      this.currentEmail = account.email;
      return;
    }

    // No saved session, or it was logged out: log in through the UI and save the new session.
    await this.logInWithForm(account);
    this.currentEmail = account.email;
  }

  /** Log out from the profile menu and delete the saved session (logging out ends it). */
  async signOut(): Promise<void> {
    await new ProfileMenu(this.page).logOut();
    if (this.currentEmail) {
      await forgetSession(this.currentEmail);
      this.currentEmail = undefined;
    }
  }

  /** Put the saved storage into the browser and open the landing page; true if it is signed in. */
  private async restore(saved: SavedSession): Promise<boolean> {
    const context = this.page.context();
    const origin = new URL(saved.landingUrl).origin;

    // Cookies can be added directly.
    await context.addCookies(saved.state.cookies);

    // localStorage (where the site keeps the login) can only be written from a page of the site.
    // Serve an empty page at a made-up URL of the site so none of the site's scripts run, write the
    // saved values there, then open the real landing page.
    const blankUrl = `${origin}/__playwright_restore_session__`;
    await this.page.route(blankUrl, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Restoring session</title>' }));
    await this.page.goto(blankUrl);
    const items = (saved.state.origins.find((entry) => entry.origin === origin)?.localStorage ?? [])
      .map((item) => (item.name === persistRootKey ? { ...item, value: onlyLoginState(item.value) } : item));
    await this.page.evaluate((values) => {
      window.localStorage.clear();
      for (const { name, value } of values) {
        window.localStorage.setItem(name, value);
      }
    }, items);
    await this.page.unroute(blankUrl);

    // Open the landing page and see whether the site treats us as signed in.
    await this.page.goto(saved.landingUrl, { waitUntil: 'domcontentloaded' });
    await this.signedInIndicator.or(this.signedOutIndicator).first()
      .waitFor({ state: 'visible', timeout: 30_000 })
      .catch(() => undefined);
    return this.signedInIndicator.isVisible();
  }

  /** Log in on the login page, wait for the signed-in page, and save the session for later tests. */
  private async logInWithForm(account: Credentials): Promise<void> {
    // Fill in and submit the login form.
    const loginPage = new LoginPage(this.page);
    await loginPage.open();
    await loginPage.login(account.email, account.password);

    // Wait for the redirect away from /login, then for the signed-in page. The site writes the login
    // to localStorage around the time the page shows the user, so save only after that.
    await this.page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 60_000, waitUntil: 'commit' });
    await this.signedInIndicator.waitFor({ state: 'visible', timeout: 60_000 });

    // Save the session for the next test that signs in as this account.
    const session: SavedSession = {
      email: account.email,
      savedAt: Date.now(),
      landingUrl: this.page.url(),
      state: await this.page.context().storageState(),
    };
    mkdirSync(sessionDir, { recursive: true });
    await writeFile(sessionPath(account.email), JSON.stringify(session), 'utf8');
  }
}
