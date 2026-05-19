# Property Management Owner Command Center

Private, read-only owner dashboard for the `Property Management Master Tracker` Google Sheet.

The Google Sheet remains the backend and source of truth. This app turns the tracker into a secure owner-facing command center with KPI cards, risk panels, notice tracking, maintenance status, mortgage/allotment monitoring, utilities analysis, admin tasks, and follow-up deadlines.

## What Version 1 Does

- Requires Google login.
- Restricts access to one approved owner email.
- Reads the private Google Sheet through server-side code only.
- Shows data from the tracker in luxury command-center pages.
- Calculates display-only status, risk, and next-action fields.
- Keeps all tenant data out of public static files.
- Does not write back to Google Sheets.
- Does not send emails, notices, tenant messages, or legal filings.

## Source Of Truth

The spreadsheet is still the operating system. The app reads from these tabs:

- Dashboard
- Rent Collection
- Maintenance
- Notices & Evictions
- Mortgage & Allotments
- Admin Task Log
- Calendar & Follow-Ups
- Cash Flow Summary
- Payment Arrangements
- Arrears Payoff Tracker
- Property Manager Reports
- Expense Import Summary
- Section 8 HAP Payments
- Utilities

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local`.

3. Fill in the environment variables:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=14nzzWCKIi0h-zHkCzW0JXmN-NQNcAWZahLpDy3CXK0c
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
APPROVED_OWNER_EMAIL=
NEXT_PUBLIC_APP_NAME=Property Management Owner Command Center
```

4. Run locally:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Google Sheets API Setup

1. Go to Google Cloud Console.
2. Create or select a project.
3. Enable the Google Sheets API.
4. Create a service account.
5. Create a JSON key for the service account.
6. Copy the service account email into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
7. Copy the private key into `GOOGLE_PRIVATE_KEY`.

The private key should keep escaped newlines:

```bash
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Share The Private Sheet

Open the Google Sheet and share it with the service account email. Viewer access is enough because this app is read-only.

Do not make the Sheet public.

## Google Login Setup

1. In Google Cloud Console, create OAuth client credentials for a web application.
2. Add this local redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

3. For production, add:

```text
https://your-domain.com/api/auth/callback/google
```

4. Put the OAuth client ID and secret into:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

5. Set `APPROVED_OWNER_EMAIL` to the only email allowed to access the app.

## Secure Deployment

- Deploy to a private production environment such as Vercel.
- Set all secrets in the hosting provider environment variable settings.
- Never put service account values in `NEXT_PUBLIC_` variables.
- Keep `GOOGLE_PRIVATE_KEY`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` server-only.
- Set `NEXTAUTH_URL` to the final production URL.
- Add the production Google OAuth callback URL before launch.
- Keep the Google Sheet private and shared only with the service account.
- Confirm `APPROVED_OWNER_EMAIL` is your owner login email.

## Why Version 1 Is Read-Only

This app handles sensitive property, tenant, rent, maintenance, and notice information. Version 1 is intentionally read-only so the dashboard can be verified safely before any controlled write-back features are added.

Future write-back actions may include marking tasks complete, adding owner notes, uploading proof links, marking notice served, or marking a payment arrangement active. Those features are intentionally not included yet.

## Pages

- Overview
- Rent Collection
- Notices & Evictions
- Maintenance
- Mortgage & Arrears
- Utilities
- Admin Tasks
- Calendar & Follow-Ups
- Settings / System Status

## Utilities Page

The Utilities page reads from the `Utilities` tab in the Google Sheet. It shows utility cost and usage trends without writing back to the tracker.

The page includes:

- Total utility cost YTD, current month cost, portfolio-size cost KPIs, average monthly utility cost, usage spikes, unpaid bills, and missing bill/review counts.
- Filters for property, utility type, year, payment status, and review status.
- Charts for monthly utility cost trend, usage by utility type, cost by property, cost by utility type, year-over-year usage when multiple years exist, and usage spike alerts.
- A read-only utility records table with bill/receipt links displayed safely as links.

## Safety Boundaries

The Notices & Evictions page is only for tracking, reminders, and owner review. It does not file cases, send notices, threaten tenants, contact tenants, or generate eviction documents automatically.

## Verification

After environment variables are configured and dependencies are installed, run:

```bash
npm run typecheck
npm run build
```

The Settings page will show connection status, detected tabs, missing tabs, auth status, and whether required environment variables are configured without revealing secret values.
