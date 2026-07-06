# Property Management Owner Command Center

Private owner dashboard for the Property Command Center.

## Production Mode

Production is live-or-error only.

- The dashboard reads live Google Sheets data through `app/api/sheets/route.ts`.
- Logged-out `/api/sheets` requests return `401` because dashboard data is owner protected.
- Production never silently falls back to sample, mock, demo, hardcoded, or local static property data.
- If live Google Sheets cannot be read, pages show a clear operational error or not-connected state.

## Required Vercel Environment Variables

```env
DASHBOARD_DATA_MODE=live
GOOGLE_SHEET_ID=14nzzWCKIi0h-zHkCzW0JXmN-NQNcAWZahLpDy3CXK0c
GOOGLE_SERVICE_ACCOUNT_EMAIL=property-dashboard-reader@property-management-owner-com.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=
DASHBOARD_OWNER_PASSWORD=
DASHBOARD_SESSION_SECRET=
```

`NEXTAUTH_SECRET` or `AUTH_SECRET` may be used as signing-secret fallbacks. The app also supports these older Sheets aliases:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
```

Optional:

```env
GOOGLE_HEALTHCHECK_TOKEN=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
APPROVED_OWNER_EMAIL=
```

Read-only Google product integrations are controlled separately from write operations. The same all-scope read-only OAuth token may be copied into each token variable so every service can refresh from the same owner consent grant:

```env
GOOGLE_DRIVE_READONLY_ENABLED=true
GOOGLE_DRIVE_READONLY_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=1200_qPBmBz6KHjZY59HTPMpvXTCt5bGt

GOOGLE_CALENDAR_READONLY_ENABLED=true
GOOGLE_CALENDAR_READONLY_TOKEN=

GOOGLE_GMAIL_READONLY_ENABLED=true
GOOGLE_GMAIL_READONLY_TOKEN=

GOOGLE_TASKS_READONLY_ENABLED=true
GOOGLE_TASKS_READONLY_TOKEN=
```

Enable flag behavior:

- If a `*_READONLY_ENABLED` variable is explicitly set to `false`, that product stays disabled.
- If the flag is omitted and a supported token env exists, the app attempts the read-only status check.
- Existing legacy token names are accepted as aliases for read-only checks only: `GOOGLE_DRIVE_WRITE_TOKEN`, `GOOGLE_CALENDAR_WRITE_TOKEN`, `GMAIL_READONLY_TOKEN`, and `GOOGLE_TASKS_WRITE_TOKEN`.
- Those tokens are never used for write calls by the status routes.

Required read-only scopes:

- Google Drive: `https://www.googleapis.com/auth/drive.metadata.readonly`
- Google Calendar: `https://www.googleapis.com/auth/calendar.readonly`
- Gmail: `https://www.googleapis.com/auth/gmail.readonly`
- Google Tasks: `https://www.googleapis.com/auth/tasks.readonly`

These integrations only read safe owner-approved source data. They do not create, update, delete, move, send, complete, or modify Google data.

## Google Connection Center Checklist

The owner portal includes `/google-connection-center` for permanent connection health and recovery. It checks Gmail, Drive, Calendar, Tasks, and Sheets and reports exact failure classes: `token expired`, `refresh token missing`, `scope missing`, `env var missing`, `API disabled`, `permission denied`, and `Vercel production env mismatch`.

Local `.env.local` must include:

```env
DASHBOARD_DATA_MODE=live
DASHBOARD_OWNER_PASSWORD=
DASHBOARD_SESSION_SECRET=
GOOGLE_SHEET_ID=14nzzWCKIi0h-zHkCzW0JXmN-NQNcAWZahLpDy3CXK0c
GOOGLE_SERVICE_ACCOUNT_EMAIL=property-dashboard-reader@property-management-owner-com.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/reconnect/callback
GOOGLE_DRIVE_READONLY_ENABLED=true
GOOGLE_DRIVE_READONLY_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=1200_qPBmBz6KHjZY59HTPMpvXTCt5bGt
GOOGLE_CALENDAR_READONLY_ENABLED=true
GOOGLE_CALENDAR_READONLY_TOKEN=
GOOGLE_GMAIL_READONLY_ENABLED=true
GOOGLE_GMAIL_READONLY_TOKEN=
GOOGLE_TASKS_READONLY_ENABLED=true
GOOGLE_TASKS_READONLY_TOKEN=
```

Vercel Production must include the same values, except `GOOGLE_REDIRECT_URI` should be:

```env
GOOGLE_REDIRECT_URI=https://property-command-center-dashboard.vercel.app/api/google/reconnect/callback
```

Reconnect flow:

1. Open `/google-connection-center` while logged in as owner.
2. Click `Fix / Reconnect Google`.
3. Approve the read-only scopes only.
4. Copy the returned env values into local `.env.local` and Vercel Production.
5. Redeploy Vercel and rerun the health check.

If access tokens expire and a refresh token is present, the app refreshes automatically. Manual reconnect is required only when the refresh token is missing, revoked, or lacks a required read-only scope.

## Safe Health Checks

Public safe metadata endpoint:

```text
https://property-command-center-dashboard.vercel.app/api/health/google-sheets
```

Expected working result:

- `ok=true`
- `isLive=true`
- `mode=live`
- `spreadsheetId=14nzzWCKIi0h-zHkCzW0JXmN-NQNcAWZahLpDy3CXK0c`
- `serviceAccountEmail=property-dashboard-reader@property-management-owner-com.iam.gserviceaccount.com`
- `missingEnvVars=[]`

Google products summary:

```text
https://property-command-center-dashboard.vercel.app/api/health/google-products
```

Product behavior:

- Google Sheets: real live read-only connection test.
- Google Drive: `live`, `not_enabled`, `not_configured`, or `error` using read-only Drive metadata.
- Google Calendar: `live`, `not_enabled`, `not_configured`, or `error` using read-only Calendar access.
- Gmail: `live`, `not_enabled`, `not_configured`, or `error` using Gmail read-only access for intake.
- Google Tasks: `live`, `not_enabled`, `not_configured`, or `error` using read-only Tasks access.

If `GOOGLE_HEALTHCHECK_TOKEN` is set, pass `?token=<token>` or header `x-healthcheck-token`.

Owner-authenticated product status routes:

```text
/api/google/drive/status
/api/google/calendar/status
/api/google/gmail/status
/api/google/tasks/status
/api/google/products/status
```

## Read-Only OAuth Token Rotation

Use the local setup helper or `/google-connection-center` when Drive, Calendar, Gmail, or Tasks returns `invalid_grant`, `refresh token missing`, or a missing-scope error.

```bash
node scripts/google-readonly-oauth-setup.cjs auth-url
```

Open the printed Google consent URL while signed into the owner Google account. The script requests only:

- `https://www.googleapis.com/auth/drive.metadata.readonly`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/tasks.readonly`

After Google returns the authorization code:

```bash
node scripts/google-readonly-oauth-setup.cjs exchange --code <AUTHORIZATION_CODE>
```

The exchange writes `.tmp-google-readonly-oauth-env.json`, which is ignored by Git and contains the Vercel env var names/values to add. Do not commit or print that file. After adding the variables to Vercel Production, delete the file and redeploy.

## Local Development

Local development may use explicit sample mode only when `NODE_ENV` is not production:

```env
DASHBOARD_DATA_MODE=sample
```

Production ignores/rejects sample mode and requires live Sheets.

## Workbook Structure

Live mode expects the workbook to contain these tabs and columns:

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

Missing tabs or columns are reported as live workbook/schema issues. They do not trigger fake data.

## Safety Boundaries

The portal does not:

- Write to Google Sheets.
- Move, rename, delete, or modify Google Drive files.
- Send or read Gmail message bodies.
- Create, update, complete, or delete Calendar events.
- Create, update, complete, or delete Google Tasks.
- Contact tenants, vendors, lenders, courts, attorneys, HACP, utilities, or anyone else.
- Send notices, file legal documents, sign leases, or make payments.

## Validation

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Production verification:

1. Open `/api/health/google-sheets` and confirm `ok=true` and `isLive=true`.
2. Confirm logged-out `/api/sheets?view=overview` returns `401`.
3. Log in as owner and confirm the dashboard pages show `Live Google Sheets` or a clear operational error.
