"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Copy, Search, ShieldCheck, Wrench } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  commandCenterPeriod,
  maintenanceRows,
  money,
  monthOptions,
  yearOptions,
  type MaintenanceCommandRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";

type MaintenanceFilter = {
  month: string;
  year: number;
  property: string;
  unit: string;
  tenant: string;
  priority: string;
  status: string;
  vendorState: string;
  proofMissing: boolean;
  tenantUpdateNeeded: boolean;
  criticalOnly: boolean;
  search: string;
};

type MaintenanceCommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  controls: string;
  tone: SignalTone;
  prompt: string;
};

const defaultFilters: MaintenanceFilter = {
  month: commandCenterPeriod.monthName,
  year: commandCenterPeriod.year,
  property: "All",
  unit: "All",
  tenant: "All",
  priority: "All",
  status: "All",
  vendorState: "All",
  proofMissing: false,
  tenantUpdateNeeded: false,
  criticalOnly: false,
  search: ""
};

const actionQueue = [
  { title: "Verify Unit 6 heat/boiler controls", detail: "Confirm whether building heat can be adjusted/off safely.", tone: "red" as SignalTone },
  { title: "Determine vendor path", detail: "Decide whether owner verification or vendor dispatch is needed.", tone: "yellow" as SignalTone },
  { title: "Prepare tenant update for owner review", detail: "Draft only. No tenant message sent from dashboard.", tone: "yellow" as SignalTone },
  { title: "Save photos/invoice/proof after completion", detail: "Do not mark complete until proof is saved.", tone: "red" as SignalTone },
  { title: "Do not close until proof saved", detail: "Tenant/vendor confirmation and completion proof are required.", tone: "red" as SignalTone }
];

const blockedWarnings = [
  "Do not close Unit 6 issue until tenant/vendor confirmation or proof is saved.",
  "Do not mark tenant update complete until approved communication is sent/logged.",
  "Do not mark vendor complete until invoice/photos/proof are saved."
];

const proofNeededItems = [
  "Tenant confirmation",
  "Vendor completion confirmation",
  "Photos if applicable",
  "Invoice if applicable",
  "RentRedi/Gmail alert reference saved to Drive later"
];

const commandTemplates: MaintenanceCommandTemplate[] = [
  {
    id: "maintenance-review",
    title: "Codex Command - Maintenance Review",
    actionName: "Generate Codex Command: Maintenance Review",
    controls: "Open items, safety issues, vendor status, proof status, tenant updates, and owner actions.",
    tone: "red",
    prompt: `Run a Maintenance Review for the Property Command Center.

Rules:
- Read-only/local review first.
- Do not contact tenants or vendors.
- Do not update RentRedi, Google Drive, Gmail, Calendar, Google Tasks, or Sheets.
- Review open maintenance items, safety issues, vendor status, proof status, tenant update status, and owner actions.
- Produce a maintenance preview report with:
  1. Open items
  2. Critical/safety items
  3. Vendor assignment status
  4. Proof needed
  5. Tenant updates needed
  6. Owner decisions required
  7. Blocked-until-verified items
- Stop before all live actions.`
  },
  {
    id: "safety-follow-up",
    title: "Codex Command - Safety Issue Follow-Up",
    actionName: "Generate Codex Command: Safety Issue Follow-Up",
    controls: "Unit 6 heat/breathing complaint verification and safe owner decision checklist.",
    tone: "red",
    prompt: `Prepare a safety-sensitive maintenance follow-up review.

Rules:
- Do not send messages.
- Do not contact tenants or vendors.
- Do not update live systems.
- Review the Unit 6 heat/breathing complaint and identify what needs verification.
- Prepare owner decision options and a safe follow-up checklist.
- Stop before communication or live updates.`
  },
  {
    id: "vendor-follow-up",
    title: "Codex Command - Vendor Follow-Up Prep",
    actionName: "Generate Codex Command: Vendor Follow-Up Prep",
    controls: "Vendor checklist and owner-review draft language.",
    tone: "yellow",
    prompt: `Prepare vendor follow-up for maintenance items.

Rules:
- Do not contact vendors.
- Do not send emails or texts.
- Do not update calendars or tasks.
- Draft a vendor follow-up checklist and message draft for owner review.
- Include requested proof: photos, invoice, completion confirmation.
- Stop before all live communication.`
  },
  {
    id: "tenant-update",
    title: "Codex Command - Tenant Maintenance Update Draft",
    actionName: "Generate Codex Command: Tenant Maintenance Update Draft",
    controls: "Draft-only tenant update for owner review.",
    tone: "yellow",
    prompt: `Draft a tenant maintenance update for owner review.

Rules:
- Do not send the message.
- Do not contact the tenant.
- Keep tone professional and safety-aware.
- Avoid legal conclusions or promises not confirmed by owner/vendor.
- Draft only and stop for owner approval.`
  },
  {
    id: "proof-checklist",
    title: "Codex Command - Maintenance Proof Checklist",
    actionName: "Generate Codex Command: Maintenance Proof Checklist",
    controls: "Proof checklist for tenant confirmation, vendor confirmation, photos, invoices, and logs.",
    tone: "yellow",
    prompt: `Prepare a maintenance proof checklist.

Rules:
- Do not upload or move files.
- Do not update Google Drive.
- Identify proof needed for each maintenance item:
  1. Tenant confirmation
  2. Vendor confirmation
  3. Photos
  4. Invoice
  5. Completion date
  6. Communication log
- Stop before live actions.`
  },
  {
    id: "drive-update",
    title: "Codex Command - Maintenance Google Drive Update",
    actionName: "Generate Codex Command: Maintenance Google Drive Update",
    controls: "Drive preview package for maintenance status, proof needs, vendor status, and blocked items.",
    tone: "green",
    prompt: `Prepare a Google Drive maintenance update package.

Rules:
- Do not upload, move, rename, delete, or update Drive files without owner approval.
- Prepare a preview package only.
- Include maintenance status, proof-needed checklist, vendor status, tenant update status, and blocked-until-verified items.
- Stop and ask for owner approval before any Drive write.`
  }
];

function proofStatus(row: MaintenanceCommandRow) {
  return row.proofStatus ?? (row.photosReceiptsLink && !["Not saved", ""].includes(row.photosReceiptsLink) ? "Saved" : "Missing");
}

function ownerAction(row: MaintenanceCommandRow) {
  return row.ownerAction ?? (row.priority === "Critical" ? "Verify safety issue and determine vendor path" : "Review and update local tracker");
}

function vendorAssigned(row: MaintenanceCommandRow) {
  const vendor = row.assignedVendor.toLowerCase();
  return Boolean(row.assignedVendor) && !vendor.includes("tbd") && !vendor.includes("quote needed") && !vendor.includes("owner verify");
}

function tenantUpdateNeeded(row: MaintenanceCommandRow) {
  return row.tenantUpdateSent.toLowerCase() === "no";
}

function isOpen(row: MaintenanceCommandRow) {
  return row.status.toLowerCase() !== "complete";
}

function MaintenanceHeader({ filters, onFiltersChange }: { filters: MaintenanceFilter; onFiltersChange: (next: MaintenanceFilter) => void }) {
  return (
    <section className="maintenance-command-header">
      <div>
        <p className="eyebrow">Local Sample Mode</p>
        <h2>Maintenance Command</h2>
        <p>Open work orders, health/safety issues, vendor status, proof tracking, tenant updates, and completion verification.</p>
        <div className="hero-source-strip">
          <span>Local Sample Mode</span>
          <span>No live RentRedi, Gmail, Drive, Calendar, or vendor updates</span>
          <span>Last updated: May 21, 2026, 9:00 AM</span>
        </div>
      </div>
      <div className="rent-period-filter">
        <label>
          <span>Month</span>
          <select value={filters.month} onChange={(event) => onFiltersChange({ ...filters, month: event.target.value })}>
            {monthOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Year</span>
          <select value={filters.year} onChange={(event) => onFiltersChange({ ...filters, year: Number(event.target.value) })}>
            {yearOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function MaintenanceKpis() {
  const openItems = maintenanceRows.filter(isOpen).length;
  const criticalItems = maintenanceRows.filter((row) => row.priority === "Critical" && isOpen(row)).length;
  const assignedCount = maintenanceRows.filter(vendorAssigned).length;
  const proofMissing = maintenanceRows.filter((row) => proofStatus(row) === "Missing").length;
  const updatesNeeded = maintenanceRows.filter(tenantUpdateNeeded).length;
  const estimatedCost = maintenanceRows.reduce((total, row) => total + row.estimatedCost, 0);
  const actualCost = maintenanceRows.reduce((total, row) => total + (row.actualCost ?? 0), 0);
  const completionRate = maintenanceRows.length ? maintenanceRows.filter((row) => row.status === "Complete").length / maintenanceRows.length : 0;
  const kpis = [
    { label: "Open Maintenance Items", value: String(openItems), helper: "Open or waiting local work orders", tone: openItems ? "yellow" as SignalTone : "green" as SignalTone },
    { label: "Critical / Safety Items", value: String(criticalItems), helper: "Health/safety-sensitive open items", tone: criticalItems ? "red" as SignalTone : "green" as SignalTone },
    { label: "Vendor Assigned", value: String(assignedCount), helper: "Rows with named vendor/crew", tone: assignedCount ? "green" as SignalTone : "yellow" as SignalTone },
    { label: "Proof Missing", value: String(proofMissing), helper: "Photos, invoice, or confirmation needed", tone: proofMissing ? "red" as SignalTone : "green" as SignalTone },
    { label: "Tenant Update Needed", value: String(updatesNeeded), helper: "No approved/logged update yet", tone: updatesNeeded ? "yellow" as SignalTone : "green" as SignalTone },
    { label: "Estimated Cost", value: money(estimatedCost), helper: "Local sample estimate total", tone: "yellow" as SignalTone },
    { label: "Actual Cost", value: money(actualCost), helper: "Known actual cost only", tone: actualCost > 500 ? "red" as SignalTone : "green" as SignalTone },
    { label: "Completion Rate", value: `${Math.round(completionRate * 100)}%`, helper: "Complete items / all items", tone: completionRate === 1 ? "green" as SignalTone : "yellow" as SignalTone }
  ];

  return (
    <section className="rent-kpi-grid maintenance-kpi-grid">
      {kpis.map((kpi) => (
        <article key={kpi.label} className={`rent-kpi-card queue-${kpi.tone}`}>
          <span>{kpi.label}</span>
          <strong>{kpi.value}</strong>
          <p>{kpi.helper}</p>
        </article>
      ))}
    </section>
  );
}

function MaintenanceHealthEvaluation() {
  return (
    <section className="section-block maintenance-health-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Command Evaluation</p>
          <h2>Maintenance health: Critical</h2>
        </div>
        <StatusBadge label="Health / Safety Sensitive" />
      </div>
      <p>
        Maintenance health is critical because Unit 6 / Building Heat remains open, tenant Jennifer Badger reported heat on in May,
        possible need to sleep outside, and a recent ER visit for breathing issues. Vendor is still TBD / Owner Verify, tenant update
        is not sent, and proof/photos/invoice are not saved.
      </p>
      <div className="maintenance-cause-grid">
        {[
          "Verify heat/boiler controls.",
          "Confirm whether tenant or another person is operating heat controls.",
          "Decide vendor path.",
          "Send approved tenant update.",
          "Save proof/photos/invoice after completion.",
          "Do not close item until proof is saved."
        ].map((item) => (
          <article key={item}>
            <AlertTriangle size={16} aria-hidden />
            <span>{item}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function MaintenanceFilters({ filters, onFiltersChange }: { filters: MaintenanceFilter; onFiltersChange: (next: MaintenanceFilter) => void }) {
  const propertyOptions = ["All", ...Array.from(new Set(maintenanceRows.map((row) => row.property)))];
  const unitOptions = ["All", ...Array.from(new Set(maintenanceRows.map((row) => row.unit)))];
  const tenantOptions = ["All", ...Array.from(new Set(maintenanceRows.map((row) => row.tenant)))];
  const priorityOptions = ["All", "Critical", "High", "Normal", "Low"];
  const statusOptions = ["All", ...Array.from(new Set(maintenanceRows.map((row) => row.status)))];

  return (
    <section className="section-block maintenance-filter-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Filters</p>
          <h2>Find work order issues fast</h2>
        </div>
        <Search size={18} aria-hidden />
      </div>
      <div className="maintenance-filter-grid">
        {[
          { label: "Property", value: filters.property, key: "property", options: propertyOptions },
          { label: "Unit", value: filters.unit, key: "unit", options: unitOptions },
          { label: "Tenant", value: filters.tenant, key: "tenant", options: tenantOptions },
          { label: "Priority", value: filters.priority, key: "priority", options: priorityOptions },
          { label: "Status", value: filters.status, key: "status", options: statusOptions },
          { label: "Vendor", value: filters.vendorState, key: "vendorState", options: ["All", "Assigned", "Not Assigned"] }
        ].map((control) => (
          <label key={control.key}>
            <span>{control.label}</span>
            <select value={control.value} onChange={(event) => onFiltersChange({ ...filters, [control.key]: event.target.value })}>
              {control.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        ))}
        <label className="search-control">
          <span>Issue Search</span>
          <input value={filters.search} onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })} placeholder="Search issue text" />
        </label>
      </div>
      <div className="rent-toggle-row">
        <label><input type="checkbox" checked={filters.proofMissing} onChange={(event) => onFiltersChange({ ...filters, proofMissing: event.target.checked })} /> Proof missing</label>
        <label><input type="checkbox" checked={filters.tenantUpdateNeeded} onChange={(event) => onFiltersChange({ ...filters, tenantUpdateNeeded: event.target.checked })} /> Tenant update needed</label>
        <label><input type="checkbox" checked={filters.criticalOnly} onChange={(event) => onFiltersChange({ ...filters, criticalOnly: event.target.checked })} /> Critical only</label>
      </div>
    </section>
  );
}

function matchesFilters(row: MaintenanceCommandRow, filters: MaintenanceFilter) {
  const inSamplePeriod = filters.month === commandCenterPeriod.monthName && filters.year === commandCenterPeriod.year;

  if (!inSamplePeriod) return false;
  if (filters.property !== "All" && row.property !== filters.property) return false;
  if (filters.unit !== "All" && row.unit !== filters.unit) return false;
  if (filters.tenant !== "All" && row.tenant !== filters.tenant) return false;
  if (filters.priority !== "All" && row.priority !== filters.priority) return false;
  if (filters.status !== "All" && row.status !== filters.status) return false;
  if (filters.vendorState === "Assigned" && !vendorAssigned(row)) return false;
  if (filters.vendorState === "Not Assigned" && vendorAssigned(row)) return false;
  if (filters.proofMissing && proofStatus(row) !== "Missing") return false;
  if (filters.tenantUpdateNeeded && !tenantUpdateNeeded(row)) return false;
  if (filters.criticalOnly && row.priority !== "Critical") return false;
  if (filters.search && !row.issue.toLowerCase().includes(filters.search.toLowerCase())) return false;
  return true;
}

const columns: DataTableColumn<MaintenanceCommandRow>[] = [
  { key: "dateReported", header: "Date Reported", render: (row) => row.dateReported },
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "unit", header: "Unit", render: (row) => row.unit },
  { key: "tenant", header: "Tenant", render: (row) => row.tenant },
  { key: "issue", header: "Issue", render: (row) => row.issue },
  { key: "priority", header: "Priority", render: (row) => <StatusBadge label={row.priority} /> },
  { key: "assignedVendor", header: "Assigned Vendor", render: (row) => row.assignedVendor || "Not assigned" },
  { key: "estimatedCost", header: "Estimated Cost", render: (row) => money(row.estimatedCost), className: "numeric" },
  { key: "actualCost", header: "Actual Cost", render: (row) => row.actualCost === undefined ? "Unknown" : money(row.actualCost), className: "numeric" },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  { key: "dateCompleted", header: "Date Completed", render: (row) => row.dateCompleted || "Open" },
  { key: "tenantUpdateSent", header: "Tenant Update Sent", render: (row) => <StatusBadge label={row.tenantUpdateSent} /> },
  { key: "photosReceiptsLink", header: "Photos/Receipts Link", render: (row) => row.photosReceiptsLink || "Not saved" },
  { key: "proofStatus", header: "Proof Status", render: (row) => <StatusBadge label={proofStatus(row)} /> },
  { key: "ownerAction", header: "Owner Action", render: (row) => ownerAction(row) },
  { key: "notes", header: "Notes", render: (row) => row.notes }
];

function MaintenanceActionQueue() {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Action Queue</p>
          <h2>Maintenance Action Queue</h2>
        </div>
        <Wrench size={18} aria-hidden />
      </div>
      <div className="maintenance-action-grid">
        {actionQueue.map((item) => (
          <article key={item.title} className={`maintenance-action-card queue-${item.tone}`}>
            <span>{item.title}</span>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BlockedUntilVerified() {
  return (
    <section className="section-block maintenance-blocked-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Blocked Until Verified</p>
          <h2>Completion is blocked until proof exists</h2>
        </div>
        <AlertTriangle size={18} aria-hidden />
      </div>
      <div className="maintenance-warning-list">
        {blockedWarnings.map((warning) => (
          <article key={warning}>
            <AlertTriangle size={16} aria-hidden />
            <span>{warning}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProofNeeded() {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Proof Needed</p>
          <h2>Completion evidence checklist</h2>
        </div>
        <ClipboardList size={18} aria-hidden />
      </div>
      <div className="maintenance-proof-grid">
        {proofNeededItems.map((item) => (
          <article key={item}>
            <CheckCircle2 size={16} aria-hidden />
            <span>{item}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function VendorAndTenantTrackers() {
  const activeRows = maintenanceRows.filter(isOpen);

  return (
    <section className="maintenance-tracker-grid">
      <article className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Vendor / Assignment Tracker</p>
            <h2>Vendor path and proof required</h2>
          </div>
          <Wrench size={18} aria-hidden />
        </div>
        <div className="maintenance-mini-list">
          {activeRows.map((row) => (
            <div key={row.id}>
              <span>{row.unit}</span>
              <strong>{row.assignedVendor}</strong>
              <p>Status: {row.status}. Next vendor action: {vendorAssigned(row) ? "Confirm completion and proof." : "Owner approval needed to choose vendor path."}</p>
              <footer>Proof required: {proofStatus(row) === "Missing" ? "Yes" : "Saved"} · Owner approval needed</footer>
            </div>
          ))}
        </div>
      </article>
      <article className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tenant Communication Tracker</p>
            <h2>Draft-only tenant updates</h2>
          </div>
          <ShieldCheck size={18} aria-hidden />
        </div>
        <div className="maintenance-mini-list">
          {activeRows.map((row) => (
            <div key={row.id}>
              <span>{row.tenant}</span>
              <strong>{tenantUpdateNeeded(row) ? "Tenant update needed" : "Tenant update logged"}</strong>
              <p>Draft only. Owner approval required. No live message sent from dashboard.</p>
              <footer>{row.unit} · {row.priority}</footer>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function MaintenanceCommandButtons() {
  const [activeCommand, setActiveCommand] = useState<MaintenanceCommandTemplate | null>(null);
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);

  async function copyCommand(command: MaintenanceCommandTemplate) {
    try {
      await navigator.clipboard.writeText(`${command.title}\n\n${command.prompt}`);
      setCopiedCommandId(command.id);
    } catch {
      setCopiedCommandId(null);
    }
  }

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Codex Commands</p>
          <h2>Maintenance command buttons</h2>
        </div>
        <Copy size={18} aria-hidden />
      </div>
      <div className="maintenance-command-button-grid">
        {commandTemplates.map((command) => (
          <article key={command.id} className={`codex-command-card command-kpi-${command.tone}`}>
            <span>{command.actionName}</span>
            <strong>{command.controls}</strong>
            <p>Draft command only. Owner approval required. Live writes disabled.</p>
            <button type="button" onClick={() => {
              setActiveCommand(command);
              setCopiedCommandId(null);
            }}>
              Generate command
            </button>
          </article>
        ))}
      </div>
      {activeCommand ? (
        <aside className="command-preview-panel maintenance-command-preview" aria-live="polite">
          <div className="command-preview-header">
            <div>
              <p className="eyebrow">Command Preview</p>
              <h3>{activeCommand.title}</h3>
            </div>
            <button type="button" className="ghost-button" onClick={() => setActiveCommand(null)}>Close</button>
          </div>
          <div className="command-preview-labels">
            <span>Draft command only</span>
            <span>Owner approval required</span>
            <span>Live writes disabled</span>
            <span>No tenant message sent</span>
            <span>No vendor contacted</span>
            <span>No Drive upload</span>
          </div>
          <p className="command-preview-warning">
            This dashboard does not contact tenants or vendors and does not update RentRedi, Google Drive, Gmail, Calendar, Tasks, or Sheets.
          </p>
          <pre>{activeCommand.prompt}</pre>
          <div className="command-preview-actions">
            <button type="button" onClick={() => copyCommand(activeCommand)}>
              <Copy size={16} aria-hidden />
              Copy Command
            </button>
            {copiedCommandId === activeCommand.id ? <span>Copied command to clipboard.</span> : null}
          </div>
        </aside>
      ) : null}
    </section>
  );
}

export function MaintenanceView() {
  const [filters, setFilters] = useState<MaintenanceFilter>(defaultFilters);
  const filteredRows = useMemo(() => maintenanceRows.filter((row) => matchesFilters(row, filters)), [filters]);

  return (
    <div className="view-stack maintenance-command-page">
      <MaintenanceHeader filters={filters} onFiltersChange={setFilters} />
      <MaintenanceKpis />
      <MaintenanceHealthEvaluation />
      <MaintenanceFilters filters={filters} onFiltersChange={setFilters} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Detailed Tracker</p>
            <h2>Maintenance work order table</h2>
          </div>
          <StatusBadge label={`${filteredRows.length} rows`} />
        </div>
        {filteredRows.length ? (
          <DataTable rows={filteredRows} columns={columns} />
        ) : (
          <EmptyState title="No local sample maintenance records match these filters." message="Reset filters or choose May 2026 to view the local sample tracker." />
        )}
      </section>

      <MaintenanceActionQueue />
      <BlockedUntilVerified />
      <ProofNeeded />
      <VendorAndTenantTrackers />
      <MaintenanceCommandButtons />
    </div>
  );
}
