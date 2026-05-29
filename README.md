Deployment trigger: Local Sample Mode reset verified.
# Property Management Owner Command Center

Private owner dashboard for the Property Command Center reset.

## Current Mode: Owner Password + Data Mode Switch

By default, the dashboard uses a local sample workbook in `lib/sampleWorkbook.ts`. If `DASHBOARD_DATA_MODE=live` and the read-only Google Sheets environment variables are configured outside the repository, `app/api/sheets/route.ts` reads current Google Sheets values on each request.

Current behavior:

- Dashboard login: Owner password
- Required dashboard env var: `DASHBOARD_OWNER_PASSWORD`
- Optional dashboard env var: `DASHBOARD_SESSION_SECRET`
- Google Sheets: Sample fallback by default; live read-only when explicitly configured
- Live Google APIs: Sheets read-only only when explicitly configured
- Public dashboard access: Disabled
- Local sample workbook data: Active
- Dashboard write-back actions: Disabled
- Tenant emails, notices, filings, Drive actions, Calendar actions, Tasks actions, and Sheets writes: Disabled

Do not add external login provider variables. Dashboard login uses the owner password session only.

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

The default sample mode proves the app shell, navigation, styling, routing, and dashboard views without depending on Google credentials.

## Source Of Data During Reset

The default source is local sample data:

```text
lib/sampleWorkbook.ts
```

The API route remains the same for the frontend:

```text
app/api/sheets/route.ts
```

That route returns parsed local sample data unless live mode is explicitly enabled with read-only Google Sheets credentials.

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

No `.env.local` file is required for local sample fallback mode.

## Vercel Reset Deployment

For sample fallback mode, Vercel only needs the owner password environment variables.

Confirmed reset expectation:

- Project: `property-command-center-dashboard`
- GitHub repo: `TWooden2-cyber/property-command-center-dashboard`
- Production branch: `main`
- Project environment variables for login: `DASHBOARD_OWNER_PASSWORD`, plus `DASHBOARD_SESSION_SECRET` or a signing-secret fallback
- Project environment variables for live Sheets: only required when enabling `DASHBOARD_DATA_MODE=live`

Deploy Local Sample Mode first. Enable live Google Sheets read-only only after owner approval and Vercel environment setup.

Controlled live operations are separate from live data reads. The live operations center requires owner password session protection, dry-run first, explicit owner approval, and audit logging before an execution endpoint can proceed.

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

Sample mode uses local data; live data mode reads Google Sheets. Controlled live operation APIs are disabled unless the explicit production flags are set and the matching service authorization is available.

It does not:

- Use an external OAuth provider for dashboard login
- Execute any live action without owner password session protection
- Execute any live action without dry-run first
- Execute any live action without explicit owner approval confirmation
- Send email
- Delete Gmail, Calendar, Tasks, Sheets, or Drive records
- Delete Sheet rows, columns, or tabs
- Clear ranges or overwrite full tabs
- Change Drive permissions
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

## Google Sheets Read-Only Mode

Google Sheets read-only mode is controlled by Vercel or local `.env.local` values only. Do not add real service account keys, private keys, or owner credentials to this repository.

```env
DASHBOARD_DATA_MODE=sample
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
```

The app also supports the older Vercel variable names below. If both names are present, the `GOOGLE_SHEETS_*` value wins.

```env
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

## Controlled Live Operations

Live operations use separate flags and remain blocked service-by-service when the needed authorization is missing. Do not commit tokens or secrets.

```env
LIVE_OPERATIONS_ENABLED=false
GOOGLE_SHEETS_WRITE_ENABLED=false
GMAIL_READ_ENABLED=false
GOOGLE_CALENDAR_WRITE_ENABLED=false
GOOGLE_TASKS_WRITE_ENABLED=false
GOOGLE_DRIVE_WRITE_ENABLED=false
```

The audit worksheet is `Live Operations Audit` with the headers listed in the live operations center. Every dry-run and execution is logged when Sheets write is enabled. Gmail read, Calendar create, Tasks write, and Drive create/move require their own least-privilege authorization before they move from blocked to executable.

Use `DASHBOARD_DATA_MODE=live` only when all three Google Sheets variables are configured. If live mode is requested without the required variables, the API falls back to Local Sample Mode.

Switch modes in Vercel by changing only environment variables:

```env
DASHBOARD_DATA_MODE=live
```

Return to sample mode with:

```env
DASHBOARD_DATA_MODE=sample
```

The `/api/sheets` response is owner-session protected and returns no-cache headers so a browser refresh can pull the latest Google Sheets values:

```text
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Expires: 0
```

The service account must have read access to the workbook. Store `GOOGLE_SHEETS_PRIVATE_KEY` or `GOOGLE_PRIVATE_KEY` only in Vercel or local `.env.local`. The app accepts multiline keys, escaped `\n` keys, and accidentally quoted key values, then normalizes them at runtime without displaying the key.

Authenticated `/api/sheets` responses include safe diagnostic booleans only: requested mode, resolved mode, whether live was attempted, whether each required variable was detected, whether aliases are being used, and owner-safe setup errors. Secret values are never returned.

## Google Sheets Workbook Structure

Live mode expects the workbook to contain these tabs and columns. Missing tabs or columns are reported to the authenticated owner in Settings and Data Accuracy. Missing live tabs keep the dashboard safe by using sample fallback or blank mapped fields instead of crashing.

| Tab | Required columns |
| --- | --- |
| Overview | propertyName, unit, status, rentAmount, rentStatus, maintenanceStatus, openIssues, ownerDecisionRequired, nextFollowUpDate |
| Rent Collection | property, unit, tenantLabel, rentAmount, dueDate, paidDate, balance, status, followUpNeeded, notes |
| Maintenance | workOrderId, property, unit, issue, priority, status, vendor, dateOpened, dateCompleted, proofRequired, proofReceived, nextFollowUpDate |
| Mortgage and Arrears | property, lender, monthlyPayment, dueDate, paymentStatus, arrearsBalance, allotmentStatus, nextAction, nextFollowUpDate |
| Notices and Legal Holds | property, unit, noticeType, status, draftDate, sentDate, proofStatus, ownerApprovalRequired, nextAction |
| Utilities | property, utilityType, provider, accountLabel, dueDate, amountDue, status, shutoffRisk, nextAction |
| Lease Violations | property, unit, violationType, dateReported, status, proofStatus, tenantResponse, nextAction |
| Tenant Communications | property, unit, messageType, date, status, followUpNeeded, notes |
| Vendor Communications | vendor, serviceType, property, unit, jobStatus, invoiceStatus, proofStatus, nextFollowUpDate |
| Weekly Command Reviews | reviewDate, openItems, closedItems, ownerDecisions, highRiskItems, nextWeekFocus |
| Proof Archive | property, unit, proofType, relatedItem, driveFolder, proofStatus, notes |
| Source Data Exports | source, exportDate, fileName, reviewed, imported, notes |
| Owner Approvals | approvalId, category, item, status, requestedDate, approvedDate, notes |

Placeholder variables for session signing compatibility:

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
