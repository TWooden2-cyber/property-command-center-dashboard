"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  FileText,
  FolderUp,
  ListChecks,
  ListTodo,
  MailOpen,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import type { LiveOperationServiceKey, LiveOperationsStatus } from "@/types/sheets";

type ApiPayload = {
  ok: boolean;
  status: LiveOperationsStatus;
};

type SyncedTask = {
  id: string;
  title: string;
  notes: string;
  due: string;
  status: string;
  updated: string;
  completed: string;
  relatedProperty: string;
  relatedUnit: string;
  suggestedCategory: string;
  recommendationApproved: boolean;
  matchedKeywords: string[];
};

type OwnerUpdateForm = {
  property: string;
  unit: string;
  category: string;
  currentStatus: string;
  newStatus: string;
  ownerRemarks: string;
  nextAction: string;
  followUpDate: string;
  proofStatus: string;
  vendorCompleted: string;
  tenantFollowUpNeeded: string;
  includeInMassPrompt: string;
};

type CommandItem = {
  id: string;
  category: string;
  property: string;
  unit: string;
  title: string;
  currentStatus: string;
  newStatus: string;
  ownerRemarks: string;
  source: string;
  timestamp: string;
  includeInMassPrompt: boolean;
  nextAction: string;
  proofStatus: string;
  ownerApproved?: boolean;
};

type Plan = {
  sheets: string[];
  tasks: string[];
  calendar: string[];
  drive: string[];
  gmail: string[];
  audit: string[];
  riskLevel: "Normal" | "Watch" | "High";
  actionCount: number;
  approvalCount: number;
};

type WorkflowResult = {
  dryRunId?: string;
  approved?: boolean;
  executed?: boolean;
  message: string;
  blocked?: boolean;
};

const templates = [
  "Daily Operations Sync",
  "Maintenance Follow-Up Sync",
  "Missing Proof Sync",
  "Rent Collection Follow-Up Sync",
  "Drive Routing Sync",
  "Gmail Review Sync",
  "Calendar/Task Follow-Up Sync",
  "Full Mass Update Sync"
];

const initialForm: OwnerUpdateForm = {
  property: "",
  unit: "",
  category: "Maintenance",
  currentStatus: "",
  newStatus: "",
  ownerRemarks: "",
  nextAction: "",
  followUpDate: "",
  proofStatus: "",
  vendorCompleted: "no",
  tenantFollowUpNeeded: "no",
  includeInMassPrompt: "yes"
};

function nowLabel() {
  return new Date().toLocaleString();
}

function statusLabel(enabled?: boolean, blocked?: boolean) {
  if (enabled && !blocked) return "Connected";
  if (enabled && blocked) return "Blocked";
  return "Disabled";
}

function detectRecommendedActions(item: CommandItem) {
  const text = `${item.category} ${item.title} ${item.newStatus} ${item.ownerRemarks} ${item.nextAction} ${item.proofStatus}`.toLowerCase();
  const actions: string[] = [];

  if (text.includes("maintenance") && text.includes("proof received")) {
    actions.push("Update Maintenance proofReceived = yes and status = Complete.");
    actions.push("Add proof/audit entry for completed maintenance item.");
  } else if (text.includes("maintenance") && (text.includes("proof missing") || text.includes("waiting for proof"))) {
    actions.push("Update Maintenance status = Waiting for Proof.");
    actions.push("Create proof-needed Google Task and Calendar follow-up.");
  }

  if (text.includes("rent")) {
    actions.push("Update Rent Collection notes/status and set next follow-up date.");
    actions.push("Create owner task if balance remains unpaid.");
  }

  if (text.includes("utility") || text.includes("shutoff")) {
    actions.push("Update Utilities status and create shutoff-risk follow-up if needed.");
  }

  if (text.includes("drive")) {
    actions.push("Propose approved destination folder and wait for owner approval before moving.");
  }

  if (text.includes("gmail")) {
    actions.push("Read selected email only and link it to the review queue. Do not send, reply, archive, or delete.");
  }

  if (!actions.length) {
    actions.push("Update source tracker notes/status and create owner follow-up if needed.");
  }

  return actions;
}

function buildPlan(items: CommandItem[]): Plan {
  const sheets: string[] = [];
  const tasks: string[] = [];
  const calendar: string[] = [];
  const drive: string[] = [];
  const gmail: string[] = [];
  const audit: string[] = [];

  items.forEach((item) => {
    sheets.push(`${item.category || "Operations"}: update ${item.property || "property"} ${item.unit || ""} from "${item.currentStatus || "not set"}" to "${item.newStatus || "review"}"; reason: ${item.ownerRemarks || item.nextAction || "owner update"}.`);
    audit.push(`Log ${item.source} update for ${item.title || item.category} with approval status ${item.ownerApproved ? "owner-approved from task note" : "pending owner approval"}.`);

    detectRecommendedActions(item).forEach((action) => {
      if (action.includes("Google Task") || action.includes("owner task")) tasks.push(action);
      else if (action.includes("Calendar")) calendar.push(action);
      else if (action.includes("folder") || action.includes("Drive")) drive.push(action);
      else if (action.includes("email")) gmail.push(action);
      else sheets.push(action);
    });
  });

  const all = [...sheets, ...tasks, ...calendar, ...drive, ...gmail, ...audit];
  const riskLevel = items.some((item) => /legal|notice|payment|tenant/i.test(`${item.category} ${item.title} ${item.ownerRemarks}`)) ? "High" : items.length > 3 ? "Watch" : "Normal";

  return {
    sheets,
    tasks,
    calendar,
    drive,
    gmail,
    audit,
    riskLevel,
    actionCount: all.length,
    approvalCount: items.filter((item) => !item.ownerApproved).length
  };
}

function buildCodexPrompt(items: CommandItem[], plan: Plan, template: string) {
  const itemLines = items.map((item, index) => (
    `${index + 1}. ${item.category} | ${item.property || "No property"} ${item.unit || ""} | ${item.title} | ${item.currentStatus || "not set"} -> ${item.newStatus || "review"} | Remarks: ${item.ownerRemarks || "None"} | Source: ${item.source}`
  ));

  return `Generate and execute approved mass update plan for the following owner-reviewed items.

Template: ${template}

Selected completed/updated items:
${itemLines.join("\n") || "None selected."}

Proposed Google Sheets actions:
${plan.sheets.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed Google Task actions:
${plan.tasks.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed Google Calendar actions:
${plan.calendar.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed Google Drive routing actions:
${plan.drive.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed Gmail read actions:
${plan.gmail.map((item) => `- ${item}`).join("\n") || "- None"}

Audit log actions:
${plan.audit.map((item) => `- ${item}`).join("\n") || "- None"}

Safety rules:
DO NOT:
- send Gmail
- reply to Gmail
- forward Gmail
- archive Gmail
- delete Gmail
- delete Drive files
- trash Drive files
- change Drive permissions
- share Drive files
- delete Calendar events
- delete Tasks
- perform legal/payment/tenant notice actions without explicit approval
- execute anything not listed in the approved plan

Dry-run is required. Owner approval is required. Audit logging is required.`;
}

export function LiveOperationsView() {
  const [status, setStatus] = useState<LiveOperationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState("Full Mass Update Sync");
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState<CommandItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [tasks, setTasks] = useState<SyncedTask[]>([]);
  const [taskMessage, setTaskMessage] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [prompt, setPrompt] = useState("");
  const [workflow, setWorkflow] = useState<WorkflowResult>({ message: "No dry-run generated yet." });

  useEffect(() => {
    let active = true;

    fetch("/api/live-operations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load live operations status.");
        return response.json() as Promise<ApiPayload>;
      })
      .then((payload) => {
        if (active) setStatus(payload.status);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load live operations status.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const services = status?.services;
  const selectedItems = useMemo(() => items.filter((item) => selected[item.id] && item.includeInMassPrompt), [items, selected]);
  const recommendations = useMemo(() => selectedItems.flatMap((item) => detectRecommendedActions(item).map((action) => ({ item, action }))), [selectedItems]);

  function addFormItem() {
    const id = `dashboard-${Date.now()}`;
    const title = `${form.category} update${form.property ? ` - ${form.property}` : ""}${form.unit ? ` ${form.unit}` : ""}`;
    const item: CommandItem = {
      id,
      category: form.category,
      property: form.property,
      unit: form.unit,
      title,
      currentStatus: form.currentStatus,
      newStatus: form.newStatus,
      ownerRemarks: form.ownerRemarks,
      source: "Dashboard",
      timestamp: nowLabel(),
      includeInMassPrompt: form.includeInMassPrompt === "yes",
      nextAction: form.nextAction,
      proofStatus: form.proofStatus,
      ownerApproved: false
    };

    setItems((previous) => [item, ...previous]);
    setSelected((previous) => ({ ...previous, [id]: item.includeInMassPrompt }));
  }

  async function syncTasks() {
    setTaskMessage("Syncing Google Tasks updates...");
    const response = await fetch("/api/live-operations/tasks", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      setTaskMessage(payload.error || "Unable to sync Google Tasks.");
      return;
    }

    setTasks(payload.tasks || []);
    setTaskMessage(`${(payload.tasks || []).length} Google Tasks loaded for owner review.`);
  }

  function addSelectedTasksToMassPrompt() {
    const taskItems = tasks.map<CommandItem>((task) => {
      const id = `task-${task.id}`;
      return {
        id,
        category: task.suggestedCategory,
        property: task.relatedProperty,
        unit: task.relatedUnit,
        title: task.title,
        currentStatus: task.status,
        newStatus: task.completed ? "Completed / Owner Updated" : "Updated / Needs Review",
        ownerRemarks: task.notes,
        source: "Google Tasks",
        timestamp: task.completed || task.updated || nowLabel(),
        includeInMassPrompt: true,
        nextAction: task.matchedKeywords.includes("PROOF MISSING") ? "Create proof follow-up" : "Review task update",
        proofStatus: task.matchedKeywords.includes("PROOF RECEIVED") ? "Received" : task.matchedKeywords.includes("PROOF MISSING") ? "Missing" : "",
        ownerApproved: task.recommendationApproved
      };
    });

    setItems((previous) => [...taskItems, ...previous.filter((item) => !taskItems.some((taskItem) => taskItem.id === item.id))]);
    setSelected((previous) => ({
      ...previous,
      ...Object.fromEntries(taskItems.map((item) => [item.id, true]))
    }));
  }

  function generatePlan() {
    const nextPlan = buildPlan(selectedItems);
    setPlan(nextPlan);
    setPrompt(buildCodexPrompt(selectedItems, nextPlan, template));
    setWorkflow({ message: "Mass update plan generated. Dry-run approval is still required before direct dashboard execution." });
  }

  async function postStage(stage: "dry-run" | "approve" | "execute" | "cancel") {
    const body = {
      service: "sheets" satisfies LiveOperationServiceKey,
      stage,
      dryRunId: workflow.dryRunId,
      approvalConfirmation: stage === "approve" || stage === "execute" ? "OWNER APPROVES" : "",
      actionType: "Full Mass Update Sync",
      targetName: `${selectedItems.length} owner-reviewed items`,
      oldValue: "",
      newValue: prompt.slice(0, 900),
      reason: `Owner generated ${template} mass update plan from Live Operations Center.`
    };
    const response = await fetch("/api/live-operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();

    setWorkflow({
      dryRunId: payload.dryRunId || workflow.dryRunId,
      approved: Boolean(payload.approved || workflow.approved),
      executed: Boolean(payload.executed),
      blocked: !response.ok,
      message: payload.error || payload.result || (payload.dryRunId ? "Dry-run logged. Review the plan, then approve." : payload.approved ? "Plan approved for supported Google actions." : payload.cancelled ? "Plan held." : "Workflow updated.")
    });
  }

  if (loading) return <LoadingState label="Loading owner command center..." />;
  if (error) return <ErrorState message={error} />;
  if (!status || !services) return <EmptyState title="No live operations status" message="The live operations control layer did not return a status." />;

  return (
    <div className="owner-command-center">
      <section className="owner-gate-bar">
        <span><strong>Operations Gate</strong><StatusBadge label={status.liveOperationsEnabled ? "Enabled" : "Disabled"} /></span>
        <span><strong>Dry-Run</strong><StatusBadge label={status.dryRunRequired ? "Required" : "Disabled"} /></span>
        <span><strong>Owner Approval</strong><StatusBadge label={status.ownerApprovalRequired ? "Required" : "Disabled"} /></span>
        <span><strong>Audit Logging</strong><StatusBadge label={status.auditLoggingEnabled ? "Enabled" : "Blocked"} /></span>
        <a className="icon-text-button" href="#live-operations-audit"><FileText size={16} />Live Operations Audit</a>
      </section>

      <section className="owner-command-hero">
        <div>
          <p className="eyebrow">01 Owner Command Generator</p>
          <h2>Quick templates</h2>
          <p>Choose a command template, gather owner remarks or phone-updated tasks, then generate one mass update plan and one copyable Codex prompt.</p>
        </div>
        <div className="template-button-grid">
          {templates.map((item) => (
            <button type="button" className={template === item ? "template-button active" : "template-button"} key={item} onClick={() => setTemplate(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="owner-two-column">
        <article className="owner-section-card">
          <p className="eyebrow">02 Remarks And Status Update Panel</p>
          <h3>Add owner remarks</h3>
          <div className="owner-form-grid">
            {[
              ["property", "Property"],
              ["unit", "Unit"],
              ["category", "Category"],
              ["currentStatus", "Current Status"],
              ["newStatus", "New Status"],
              ["nextAction", "Next Action"],
              ["followUpDate", "Follow-Up Date"],
              ["proofStatus", "Proof Status"]
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input value={form[key as keyof OwnerUpdateForm]} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} />
              </label>
            ))}
            <label>
              <span>Vendor Completed</span>
              <select value={form.vendorCompleted} onChange={(event) => setForm((previous) => ({ ...previous, vendorCompleted: event.target.value }))}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <label>
              <span>Tenant Follow-Up Needed</span>
              <select value={form.tenantFollowUpNeeded} onChange={(event) => setForm((previous) => ({ ...previous, tenantFollowUpNeeded: event.target.value }))}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <label>
              <span>Include in Mass Prompt</span>
              <select value={form.includeInMassPrompt} onChange={(event) => setForm((previous) => ({ ...previous, includeInMassPrompt: event.target.value }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="wide">
              <span>Owner Remarks</span>
              <textarea value={form.ownerRemarks} onChange={(event) => setForm((previous) => ({ ...previous, ownerRemarks: event.target.value }))} />
            </label>
          </div>
          <div className="operation-actions">
            <button type="button" className="icon-text-button" onClick={addFormItem}><CheckCircle2 size={16} />Add to Mass Prompt</button>
            <button type="button" className="icon-text-button" onClick={() => setForm(initialForm)}><XCircle size={16} />Clear Form</button>
          </div>
        </article>

        <article className="owner-section-card">
          <p className="eyebrow">03 Google Tasks Sync Input</p>
          <h3>Phone-updated tasks</h3>
          <p>Tasks completed or updated on your phone can be pulled into this dashboard and converted into mass update items.</p>
          <div className="operation-actions">
            <button type="button" className="icon-text-button" onClick={syncTasks}><RefreshCw size={16} />Sync Google Tasks Updates</button>
            <button type="button" className="icon-text-button" onClick={syncTasks}><ListTodo size={16} />Review Completed Tasks</button>
            <button type="button" className="icon-text-button" onClick={addSelectedTasksToMassPrompt}><CheckCircle2 size={16} />Add Selected Tasks to Mass Prompt</button>
          </div>
          <p className="operation-result">{taskMessage || "No task sync run yet."}</p>
          <div className="task-sync-list">
            {tasks.slice(0, 6).map((task) => (
              <div key={task.id}>
                <strong>{task.title}</strong>
                <span>{task.status || "needsAction"} | {task.suggestedCategory} | {task.due || "No due date"}</span>
                <small>{task.matchedKeywords.join(", ") || "No keywords matched"}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="owner-section-card">
        <p className="eyebrow">04 Completed / Updated Items</p>
        <h3>Selected mass prompt items</h3>
        <div className="operation-actions">
          <button type="button" className="icon-text-button" onClick={() => setSelected(Object.fromEntries(items.map((item) => [item.id, true])))}><ListChecks size={16} />Select All</button>
          <button type="button" className="icon-text-button" onClick={() => setSelected({})}><XCircle size={16} />Deselect All</button>
          <button type="button" className="icon-text-button" onClick={syncTasks}><RefreshCw size={16} />Refresh Detected Items</button>
          <button type="button" className="icon-text-button" onClick={() => setItems((previous) => previous.filter((item) => !selected[item.id]))}><XCircle size={16} />Remove Selected</button>
          <button type="button" className="icon-text-button" onClick={generatePlan}><PlayCircle size={16} />Generate Recommended Actions</button>
        </div>
        <div className="updated-item-list">
          {items.length ? items.map((item) => (
            <label key={item.id} className="updated-item">
              <input type="checkbox" checked={Boolean(selected[item.id])} onChange={(event) => setSelected((previous) => ({ ...previous, [item.id]: event.target.checked }))} />
              <span>{item.category}</span>
              <span>{item.property || "No property"}</span>
              <span>{item.unit || "No unit"}</span>
              <strong>{item.title}</strong>
              <span>{item.currentStatus || "not set"} - {item.newStatus || "review"}</span>
              <span>{item.ownerRemarks || "No remarks"}</span>
              <StatusBadge label={item.source} />
              <small>{item.timestamp}</small>
            </label>
          )) : <p className="muted-line">No owner remarks or synced tasks added yet.</p>}
        </div>
      </section>

      <section className="owner-two-column">
        <article className="owner-section-card">
          <p className="eyebrow">05 Recommended Next Actions</p>
          <h3>Auto-suggested from selected items</h3>
          <ul className="recommendation-list">
            {recommendations.length ? recommendations.map(({ item, action }, index) => <li key={`${item.id}-${index}`}>{action}</li>) : <li>Select items and generate recommended actions.</li>}
          </ul>
        </article>

        <article className="owner-section-card">
          <p className="eyebrow">06 Generated Mass Update Plan</p>
          <h3>{plan ? "Dry-run ready" : "Not ready"}</h3>
          <div className="plan-status-row">
            <StatusBadge label={plan ? "Dry-Run Ready" : "Not Ready"} />
            <StatusBadge label={`Risk: ${plan?.riskLevel || "Normal"}`} />
            <StatusBadge label={`${plan?.actionCount || 0} actions`} />
            <StatusBadge label={`${plan?.approvalCount || 0} approvals`} />
          </div>
          <div className="mass-plan-grid">
            {[
              ["GOOGLE SHEETS ACTIONS", plan?.sheets],
              ["GOOGLE TASK ACTIONS", plan?.tasks],
              ["GOOGLE CALENDAR ACTIONS", plan?.calendar],
              ["GOOGLE DRIVE ACTIONS", plan?.drive],
              ["GMAIL ACTIONS", plan?.gmail],
              ["AUDIT LOG ACTIONS", plan?.audit]
            ].map(([title, values]) => (
              <div key={String(title)}>
                <strong>{String(title)}</strong>
                <ul>{(values as string[] | undefined)?.length ? (values as string[]).map((value, index) => <li key={index}>{value}</li>) : <li>None proposed.</li>}</ul>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="owner-section-card">
        <p className="eyebrow">07 Owner Command Preview</p>
        <h3>Copyable Codex prompt</h3>
        <textarea className="codex-command-preview" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <div className="operation-actions">
          <button type="button" className="icon-text-button" onClick={() => navigator.clipboard.writeText(prompt)}><Copy size={16} />Copy Command</button>
          <button type="button" className="icon-text-button" onClick={() => setWorkflow({ ...workflow, message: "Command saved in browser preview state." })}><FileText size={16} />Save Command</button>
          <button type="button" className="icon-text-button" onClick={() => setWorkflow({ ...workflow, message: "Edit the command directly in the preview box." })}><ClipboardCheck size={16} />Edit Command</button>
          <button type="button" className="icon-text-button" onClick={generatePlan}><RefreshCw size={16} />Regenerate Command</button>
        </div>
      </section>

      <section className="owner-section-card">
        <p className="eyebrow">08 Approval And Execution Controls</p>
        <h3>Portal execution and Codex command workflow</h3>
        <p>Portal execution handles approved Google actions. Codex command handles repo/system/mass command workflow. Approval in this portal does not automatically run Codex.</p>
        <div className="operation-actions">
          <button type="button" className="icon-text-button" onClick={generatePlan}><PlayCircle size={16} />Generate Mass Update Plan</button>
          <button type="button" className="icon-text-button" onClick={() => postStage("dry-run")}><ShieldCheck size={16} />Generate Dry Run</button>
          <button type="button" className="icon-text-button" disabled={!workflow.dryRunId} onClick={() => postStage("approve")}><CheckCircle2 size={16} />Approve Plan</button>
          <button type="button" className="icon-text-button" onClick={() => navigator.clipboard.writeText(prompt)}><Copy size={16} />Copy Codex Command</button>
          <button type="button" className="icon-text-button" disabled={!workflow.dryRunId || !workflow.approved} onClick={() => postStage("execute")}><Database size={16} />Execute Approved Action</button>
          <button type="button" className="icon-text-button" onClick={() => postStage("cancel")}><XCircle size={16} />Cancel / Hold</button>
        </div>
        <p className={workflow.blocked ? "operation-result blocked" : "operation-result"}>{workflow.message}</p>
      </section>

      <section className="owner-section-card" id="live-operations-audit">
        <p className="eyebrow">09 Live Operations Audit</p>
        <h3>Latest audit preview</h3>
        <div className="audit-preview-grid">
          <span>timestamp</span>
          <span>service</span>
          <span>action type</span>
          <span>approval status</span>
          <span>result</span>
          <span>risk level</span>
        </div>
        <a className="icon-text-button" href="/settings"><FileText size={16} />View Full Audit Log</a>
      </section>

      <footer className="owner-safety-footer">
        No Gmail sending, Drive deletes, permission changes, uncontrolled mass execution, legal/payment/tenant notice actions, token display, env commits, or credential commits. Dry-run, owner approval, and audit logging remain required.
      </footer>
    </div>
  );
}
