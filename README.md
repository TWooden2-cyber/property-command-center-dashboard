Deployment trigger: Local Sample Mode reset verified.
# Property Management Owner Command Center

Private owner dashboard for the Property Command Center reset.

## Current Mode: Local Sample Mode

This reset build runs without live Google services. The dashboard uses a local sample workbook in `lib/sampleWorkbook.ts`, and the server route `app/api/sheets/route.ts` reads that sample workbook only.

Current behavior:

- Dashboard login: Owner password
- Required dashboard env var: `DASHBOARD_OWNER_PASSWORD`
- Optional dashboard env var: `DASHBOARD_SESSION_SECRET`
- Google Sheets: Disabled
- Live Google APIs: Disabled
- Public dashboard access: Disabled
- Local sample workbook data: Active
- Dashboard write-back actions: Disabled
- Tenant emails, notices, filings, Drive actions, Calendar actions, Tasks actions, and Sheets writes: Disabled

Do not add external login provider variables until the dashboard is stable on Vercel in Local Sample Mode.

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

- Use an external OAuth provider for dashboard login
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

## Owner Password Login

The dashboard is protected by an owner password stored outside the repository. Add these values in Vercel or local `.env.local` only:

```env
DASHBOARD_OWNER_PASSWORD=
DASHBOARD_SESSION_SECRET=
```

If `DASHBOARD_SESSION_SECRET` is not set, the app can use `NEXTAUTH_SECRET` or `AUTH_SECRET` for session signing only. If `DASHBOARD_OWNER_PASSWORD` is missing, the dashboard fails closed.

## Future Re-Enable: Google Sheets Read-Only

Google Sheets read-only re-enable work must be handled separately and deliberately. Do not add real client IDs, client secrets, service account keys, private keys, or owner credentials to this repository.

Placeholder variables for future session signing compatibility:

```env
NEXTAUTH_SECRET=
AUTH_SECRET=
```

## Git And Deployment Guardrails

Before committing, pushing, or deploying:

1. Confirm the app builds locally.
2. Confirm no real secrets are present in tracked files.
3. Confirm the dashboard still opens in Local Sample Mode.
4. Confirm `/api/sheets?view=overview` returns local sample data.
5. Get explicit approval for commit, push, or deployment.
