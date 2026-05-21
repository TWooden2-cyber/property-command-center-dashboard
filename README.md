Deployment trigger: Local Sample Mode reset verified.
# Property Management Owner Command Center

Private owner dashboard for the Property Command Center reset.

## Current Mode: Local Sample Mode

This reset build runs without live Google services. The dashboard uses a local sample workbook in `lib/sampleWorkbook.ts`, and the server route `app/api/sheets/route.ts` reads that sample workbook only.

Current behavior:

- Google OAuth: Disabled
- No Google OAuth required
- Google Sheets: Disabled
- Live Google APIs: Disabled
- Vercel environment variables: Not required for the current reset build
- No Vercel environment variables required
- Local sample workbook data: Active
- Dashboard write-back actions: Disabled
- Tenant emails, notices, filings, Drive actions, Calendar actions, Tasks actions, and Sheets writes: Disabled

Do not add OAuth or Google variables until the dashboard is stable on Vercel in Local Sample Mode.

## What The Dashboard Shows

The app presents a luxury owner command-center interface with:

- Overview
- Rent Collection
- Notices & Evictions
- Maintenance
- Utilities
- Expenses / NOI
- Mortgage & Arrears
- Admin Tasks
- Calendar & Follow-Ups
- Settings / System Status

The current reset build is designed to prove the app shell, navigation, styling, routing, and dashboard views without depending on Google credentials.

## Source Of Data During Reset

The current source is local sample data only:

```text
lib/sampleWorkbook.ts
```

The API route remains the same for the frontend:

```text
app/api/sheets/route.ts
```

That route currently returns parsed local sample data. It does not connect to Google Sheets.

## Local Setup

Use Windows PowerShell from the project folder:

```powershell
cd "C:\Users\TRS_F\OneDrive\Documents\New project\property-owner-command-center"
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

No `.env.local` file is required for the current reset build.

## Vercel Reset Deployment

For the current reset build, Vercel does not need project environment variables.

Confirmed reset expectation:

- Project: `property-command-center-dashboard`
- GitHub repo: `TWooden2-cyber/property-command-center-dashboard`
- Production branch: `main`
- Project environment variables: none required
- Shared environment variables: none required

Deploy Local Sample Mode first. After the app is stable on Vercel, live Google integrations can be re-enabled in a separate controlled batch.

## Verification

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Known current lint note:

- `components/views/UtilitiesView.tsx` has a non-blocking React hook dependency warning.

The build should pass without `.env.local` and without Vercel environment variables.

## Safety Boundaries

The reset build is read-only and local-sample-only.

It does not:

- Sign in with Google
- Read Google Sheets
- Write Google Sheets
- Read Gmail
- Send email
- Read or write Google Calendar
- Read or write Google Drive
- Read or write Google Tasks
- Contact tenants
- Send notices
- File eviction cases
- Perform mortgage, legal, financial, or tenant live actions

## Future Re-Enable: Google OAuth and Google Sheets Read-Only

These variables are not required right now. Add them only in a future re-enable batch after the dashboard is stable on Vercel in Local Sample Mode.

Placeholder variables for the future OAuth step:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

Future Google Sheets read-only re-enable work must be handled separately and deliberately. Do not add real client IDs, client secrets, service account keys, private keys, or owner credentials to this repository.

## Git And Deployment Guardrails

Before committing, pushing, or deploying:

1. Confirm the app builds locally.
2. Confirm no real secrets are present in tracked files.
3. Confirm the dashboard still opens in Local Sample Mode.
4. Confirm `/api/sheets?view=overview` returns local sample data.
5. Get explicit approval for commit, push, or deployment.
