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
| `npm test` | Run all tests (browser visible locally, headless in CI) |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | Check for TypeScript errors |
| `npm run test:<name>` | Run one test, e.g. `npm run test:wishlist` (see table below) |

**Run everything in order, headless** (recommended — later tests use accounts created by earlier ones):

```powershell
$env:RUN_SIGNUP_TEST='true'; $env:CI='true'; npx playwright test --workers=1 --retries=0
```

Signup tests create real accounts, so they are skipped unless `RUN_SIGNUP_TEST=true` (in `.env` or the shell).

## Tests

| Folder | Test | Script |
|---|---|---|
| `auth/` | Localite signup + admin verification (LOC-001) | `test:localite-signup` |
| | Login (AUTH-001, AUTH-002) | — |
| | Traveler signup (AUTH-003) | `test:signup` |
| `localite/` | Create and publish an experience | `test:create-experience` |
| | Create a gallery (GAL-001) | `test:create-gallery` |
| | Edit profile (PRF-002) | `test:edit-profile` |
| | Follow by email (FOL-001) | `test:follow-localite` |
| | Settings: phone, Bio, password (SET-002) | `test:localite-settings` |
| | Preview profile (PRF-001) | `test:preview-profile` |
| | Share profile (PRF-003) | `test:share-profile` |
| `traveler/` | Search experience and localite (SRCH-001) | `test:search` |
| | Settings: details, password (SET-001) | `test:traveler-settings` |
| | Create and edit a story (STR-001) | `test:stories` |
| | Wishlist (WSH-001) | `test:wishlist` |

## How tests share accounts

The signup tests save the accounts they create, and later tests log in with them:

- **Localite** → `testdata/localite/created-localite.json` (if missing, the `Login Email` account in `auth.csv` is used)
- **Traveler** → `testdata/traveler/created-traveler.json` (required by traveler tests)
- **Created titles and profile changes** → `testdata/localite/created-content.json`

These files are generated, local-only, and ignored by git. Tests that change a password or name update them automatically.

## Test data

| Folder | Contents |
|---|---|
| `testdata/common/` | `auth.csv` (local only) |
| `testdata/localite/` | Experience, gallery, edit-profile, and settings CSVs, plus images |
| `testdata/traveler/` | Wishlist, story, and settings CSVs, plus images |

Edit the **Value** column of a CSV to change test data; keep the **Field** names as they are.

## Project structure

```
tests/       Test cases (auth, localite, traveler)
pages/       Page objects (admin, auth, common, components, localite, traveler)
utils/       Shared helpers and test-data readers
testdata/    CSV data and images
```

## Debugging

Failed tests save a screenshot, video, and trace in `test-results/`. Run `npm run report` to view them.

## CI

GitHub Actions (`.github/workflows/playwright.yml`) runs on push and pull requests to `main`. It rebuilds `auth.csv` from the **`AUTH_CSV_BASE64`** secret — update the secret whenever `auth.csv` changes:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("testdata\common\auth.csv")) | Set-Clipboard
```

## Known issue

Traveler Settings (SET-001) fails on dev: the page does not send the selected State/City when saving.
