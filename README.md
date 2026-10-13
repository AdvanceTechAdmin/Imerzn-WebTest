# Playwright Test Framework

TypeScript end-to-end automation framework using Playwright. Currently configured for Chromium, with parallel execution and failure debugging artifacts.

## 1. Setup

Requirements: Node.js 20+ and npm.

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Set your environment variables in `.env`. Keep credentials private.

## 2. Run Tests

```powershell
npm test
npm run test:headed
npm run test:ui
npm run typecheck
npm run report
```

- `npm test` — Run all tests (headless by default).
- `npm run test:headed` — Show the browser.
- `npm run test:ui` — Open Playwright UI mode.
- `npm run typecheck` — Check TypeScript errors.
- `npm run report` — View the HTML test report.

## 3. Test Data

- `testdata/auth.csv` — Login and signup test data. This file is local-only and must not be committed.
- `testdata/create-experience.csv` — Data for creating experiences. Keep the existing field names unchanged.
- `testdata/` — Test images and other test assets.

### Signup Test

Signup is skipped by default because it can create accounts and send SMS messages.

To enable it, set `RUN_SIGNUP_TEST=true` in `.env`, then run:

```powershell
npm run test:signup
```

Use only an authorized test environment and dedicated test data.

### Create Experience Test

Set `IMERZN_PASSWORD` in your environment, then run:

```powershell
npm run test:create-experience
```

## 4. Debugging Failed Tests

- **HTML report:** `playwright-report/`
- **Screenshots, videos, and traces:** `test-results/`

Run `npm run report` to inspect the latest HTML report. Use Playwright Trace Viewer to investigate failed test steps.

## 5. Project Structure

- `tests/` — Test cases
- `pages/` — Page Object Model classes
- `utils/` — Shared helpers and test-data readers
- `testdata/` — CSV files and test assets
- `Promt/` — AI testing prompt templates
- `playwright.config.ts` — Browser settings, timeouts, retries, and reports
- `.github/workflows/` — GitHub Actions CI workflow
