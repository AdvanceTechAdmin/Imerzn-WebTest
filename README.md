# Imerzn Playwright Tests

End-to-end tests for [dev.imerzn.com](https://dev.imerzn.com) and the admin portal, written in TypeScript with Playwright (Chromium).

## Setup

Requires Node.js 20+.

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Then add **`testdata/common/auth.csv`** (logins, signup data, admin account). It holds credentials, so it is not in git — ask the team for a copy.

## Run tests

| Command | What it does |
|---|---|
| `npm test` | Run everything in order: setup → tests → booking flow (browser visible locally, headless in CI) |
| `npm test -- wishlist` | Run the test files whose path contains "wishlist" |
| `npm test -- --grep SET-002` | Run one test by its ID |
| `npm run test:setup` | Only the setup tests (create the localite, traveler, experience, gallery) |
| `npm run test:localite` / `test:traveler` / `test:auth` | Only tests tagged `@localite` / `@traveler` / `@auth` |
| `npm run test:booking` | Only the booking flow (steps 1–5, in order) |
| `npm run test:no-payment` | Everything except the tests that make a (test) card payment (`@payment`) |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | Check for TypeScript errors |

Signup tests create real accounts, so they are skipped unless `RUN_SIGNUP_TEST=true` (in `.env` or the shell). Set `HEADLESS=true` in `.env` to hide the browser locally.

### Run order

Tests run one at a time (they share accounts), in three projects:

1. **`setup`** (the four files listed as `setupTests` in `playwright.config.ts`): localite signup + admin verification (LOC-001) → traveler signup (AUTH-003) → create experience (EXP-002) → create gallery (GAL-001)
2. **`chromium`** (every other file in `tests/auth`, `tests/localite`, `tests/traveler`): tests that use what setup created
3. **`booking-flow`** (`tests/flows/booking/`, numbered files): book (BKG-001) → traveler dashboard (DSH-002) → localite dashboard (LBK-001) → traveler cancels (CNL-001) → localite cancels (LCN-001)

A failure in one project does not skip the next ones: later tests fall back to the accounts saved by an earlier run.

## Tests

Tags: `@setup`, `@auth`, `@localite`, `@traveler`, `@booking`, `@signup` (creates an account), `@payment` (pays with the test card).

| Folder | Test |
|---|---|
| `auth/` | Localite signup + admin verification (LOC-001) — setup |
| | Traveler signup (AUTH-003) — setup |
| | Login fails / succeeds (AUTH-001, AUTH-002) |
| `localite/` | Create and publish an experience (EXP-002) — setup |
| | Create a gallery (GAL-001) — setup |
| | Edit profile (PRF-002) |
| | Follow by email (FOL-001) |
| | Settings: phone, Bio, password (SET-002) |
| | Preview profile (PRF-001) |
| | Share profile (PRF-003) |
| | Referral program: referee completes a booking, referrer earns Referral % of the commission and withdraws it, then the traveler books and pays the next booking (REF-001) |
| `traveler/` | Dashboard empty states for a new traveler (DSH-001) |
| | Experience details: wishlist, share, like, message (EXP-001) |
| | Search for the created localite (SRCH-001) |
| | Settings: details, password (SET-001) |
| | Create and edit a story (STR-001) |
| | Wishlist (WSH-001) |
| `flows/booking/` | 01 Book and pay, with a promo code: 2 paid + 2 pending (BKG-001) |
| | 02 Traveler dashboard, My Bookings, Transactions (DSH-002) |
| | 03 Localite view: bookings, transactions, earnings, dashboard (LBK-001) |
| | 04 Traveler cancels an Ongoing and a Pending booking (CNL-001) |
| | 05 Localite cancels an Ongoing and a Pending booking (LCN-001) |

## Writing a test

Import `test` and `expect` from `@fixtures/test` (not `@playwright/test`), and ask for what the test needs by name:

```ts
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';

test('ABC-001 | Localite does something', { tag: ['@localite'] }, async ({ page, session, localite, guideProfilePage }) => {
  // Step 1: Sign in as the localite (reuses the saved login when there is one).
  await step('Sign in as localite', async () => {
    await session.signIn(localite);
    await expect(guideProfilePage.dashboardLink).toBeVisible();
  });
});
```

Every test automatically gets:
- the newsletter popup and cookie banner kept out of the way;
- every page object as a fixture (`loginPage`, `profileMenu`, `settingsPage`, `bookingDialog`, … — see `fixtures/test.ts`);
- the accounts created by setup: `localite` and `traveler`;
- a **"Site offline"** note on the failure when the site was showing its maintenance page.

### Signing in

`session.signIn(account)` logs in through the login form the first time an account is used, then saves the login in `.auth/` (git-ignored). Later tests restore that saved login instead of filling in the form again. If a saved login no longer works, it logs in through the form again. `session.signOut()` logs out and forgets the saved login.

Tests that are about logging in (AUTH-001/002, the "log in with the new password" steps of SET-001/002, and REF-001) use `loginPage` directly.

## How tests share accounts

The setup tests save the accounts and content they create, and later tests use them:

- **Localite** → `testdata/localite/created-localite.json` (if missing, the `Login Email` account in `auth.csv` is used)
- **Traveler** → `testdata/traveler/created-traveler.json` (required by traveler tests)
- **Created titles and profile changes** → `testdata/localite/created-content.json`
- **Bookings** (booking flow) → `testdata/traveler/created-bookings.json`

These files are generated, local-only, and ignored by git. Tests that change a password or name update them automatically.

## Test data

| Folder | Contents |
|---|---|
| `testdata/common/` | `auth.csv` (local only) |
| `testdata/localite/` | Experience, gallery, edit-profile, settings, and referral CSVs, plus images |
| `testdata/traveler/` | Booking, wishlist, story, and settings CSVs, plus images |

Edit the **Value** column of a CSV to change test data; keep the **Field** names as they are. Each CSV has one reader in `data/` that checks the values and returns them typed.

## Project structure

```
config/env.ts        Settings from .env / CI (BASE_URL, RUN_SIGNUP_TEST, HEADLESS)
fixtures/
  test.ts            The test function: page objects, accounts, session, popups, maintenance check
  session.ts         Sign in / out, with saved logins in .auth/
pages/               Page objects (admin, auth, common, localite, traveler)
  components/        Shared parts: profile menu, dialogs, newsletter popup, location picker, maintenance page
data/
  csv-loader.ts      Reads Field,Value CSVs (loadCsv) with typed, checked getters
  common/ localite/ traveler/   One reader per CSV in testdata/
  state/             The created-*.json files that pass accounts and bookings between tests
helpers/             step() and text helpers
tests/
  auth/ localite/ traveler/   Tests by role (the four setup tests among them run first)
  flows/booking/     The booking flow (run last, in file order)
testdata/            CSV data and images
scripts/             failure-report.mjs (CI failure page)
docs/                Prompt and framework notes
```

Imports use short aliases from `tsconfig.json`: `@config/…`, `@data/…`, `@fixtures/…`, `@helpers/…`, `@pages/…`.

## Debugging

Failed tests save a screenshot, video, and trace in `test-results/`. Run `npm run report` to view them.

## CI

GitHub Actions (`.github/workflows/playwright.yml`) runs on push and pull requests to `main`. It rebuilds `auth.csv` from the **`AUTH_CSV_BASE64`** secret — update the secret whenever `auth.csv` changes:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("testdata\common\auth.csv")) | Set-Clipboard
```

Failed tests (errors and screenshots, passwords masked) are published to GitHub Pages and linked from the Slack message. Turn on **Settings → Pages → Deploy from a branch → `gh-pages` / root** once for the link to work.

## Known issue

Traveler Settings (SET-001) fails on dev: the page does not send the selected State/City when saving.
