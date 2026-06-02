"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, ClipboardCheck, Database, FolderUp, ListTodo, MailOpen, PlayCircle, ShieldCheck, XCircle } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import type { LiveOperationServiceKey, LiveOperationServiceStatus, LiveOperationsStatus } from "@/types/sheets";

type ApiPayload = {
  ok: boolean;
  status: LiveOperationsStatus;
};

type StageResult = {
  service: LiveOperationServiceKey;
  message: string;
  dryRunId?: string;
  approved?: boolean;
  blocked?: boolean;
  plan?: DryRunPlan;
};

type DryRunPlan = {
  service: LiveOperationServiceKey;
  actionType: string;
  targetName: string;
  targetId: string;
  oldValue: string;
  newValue: string;
  forbiddenActionsExcluded: string[];
};

type FieldConfig = {
  key: string;
  label: string;
  type?: "date" | "datetime-local" | "number" | "textarea";
  placeholder?: string;
};

const serviceIcons = {
  sheets: Database,
  gmail: MailOpen,
  calendar: CalendarPlus,
  tasks: ListTodo,
  drive: FolderUp
};

const queueLabels: Record<LiveOperationServiceKey, string> = {
  sheets: "Sheet Write Queue",
  gmail: "Gmail Review Queue",
  calendar: "Calendar Action Queue",
  tasks: "Task Action Queue",
  drive: "Drive Routing Queue"
};

const serviceFields: Record<LiveOperationServiceKey, FieldConfig[]> = {
  tasks: [
    { key: "taskTitle", label: "Task title", placeholder: "APPROVAL NEEDED - ..." },
    { key: "dueDate", label: "Due date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea" },
    { key: "priorityCategory", label: "Priority/category", placeholder: "High / Maintenance / Owner approval" },
    { key: "relatedProperty", label: "Related property" },
    { key: "relatedUnit", label: "Related unit" }
  ],
  calendar: [
    { key: "eventTitle", label: "Event title" },
    { key: "dateTime", label: "Date/time", type: "datetime-local" },
    { key: "duration", label: "Duration", placeholder: "30 minutes" },
    { key: "notes", label: "Notes", type: "textarea" },
    { key: "propertyUnit", label: "Property/unit" }
  ],
  sheets: [
    { key: "tab", label: "Tab", placeholder: "Maintenance" },
    { key: "actionType", label: "Action type", placeholder: "Update status" },
    { key: "property", label: "Property" },
    { key: "unit", label: "Unit" },
    { key: "fieldToUpdate", label: "Field to update", placeholder: "status" },
    { key: "newValue", label: "New value" },
    { key: "notes", label: "Notes", type: "textarea" }
  ],
  gmail: [
    { key: "searchQuery", label: "Search query", placeholder: "from:vendor@example.com newer_than:30d" },
    { key: "senderSubject", label: "Sender/subject optional" },
    { key: "selectedEmail", label: "Selected email if available" }
  ],
  drive: [
    { key: "actionType", label: "Action type", placeholder: "Create folder / Move file" },
    { key: "folderOrFileName", label: "Folder name or file name" },
    { key: "destinationFolder", label: "Destination folder" },
    { key: "propertyUnit", label: "Property/unit" },
    { key: "reason", label: "Reason", type: "textarea" }
  ]
};

const initialForms = Object.fromEntries(
  (Object.keys(serviceFields) as LiveOperationServiceKey[]).map((service) => [
    service,
    Object.fromEntries(serviceFields[service].map((field) => [field.key, ""]))
  ])
) as Record<LiveOperationServiceKey, Record<string, string>>;

function serviceTone(service: LiveOperationServiceStatus) {
  if (service.enabled && !service.blocked) return "Enabled";
  if (service.enabled && service.blocked) return "Blocked";
  return "Disabled";
}

function nonBlankEntries(form: Record<string, string>) {
  return Object.entries(form).filter(([, value]) => value.trim().length > 0);
}

function summarizeCommand(service: LiveOperationServiceKey, form: Record<string, string>) {
  const values = nonBlankEntries(form);

  if (service === "tasks") return form.taskTitle || "Google Task create/update";
  if (service === "calendar") return form.eventTitle || "Calendar event create";
  if (service === "sheets") return [form.tab, form.actionType, form.fieldToUpdate].filter(Boolean).join(" - ") || "Sheet write";
  if (service === "gmail") return form.searchQuery || form.senderSubject || "Gmail read query";
  if (service === "drive") return [form.actionType, form.folderOrFileName].filter(Boolean).join(" - ") || "Drive create/move";

  return values.map(([, value]) => value).join(" - ");
}

function commandReason(service: LiveOperationServiceKey, form: Record<string, string>) {
  const values = nonBlankEntries(form).map(([key, value]) => `${key}: ${value}`);
  return values.length ? values.join(" | ") : `Owner requested ${queueLabels[service]} dry-run.`;
}

function commandNewValue(service: LiveOperationServiceKey, form: Record<string, string>) {
  if (service === "sheets") return form.newValue || "";
  if (service === "tasks") return [form.taskTitle, form.dueDate, form.priorityCategory].filter(Boolean).join(" | ");
  if (service === "calendar") return [form.eventTitle, form.dateTime, form.duration].filter(Boolean).join(" | ");
  if (service === "gmail") return [form.searchQuery, form.senderSubject, form.selectedEmail].filter(Boolean).join(" | ");
  if (service === "drive") return [form.actionType, form.folderOrFileName, form.destinationFolder].filter(Boolean).join(" | ");
  return "";
}

function inputId(service: LiveOperationServiceKey, key: string) {
  return `live-${service}-${key}`;
}

export function LiveOperationsView() {
  const [status, setStatus] = useState<LiveOperationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState(initialForms);
  const [results, setResults] = useState<Record<string, StageResult>>({});

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

  const services = useMemo(() => (status ? Object.values(status.services) : []), [status]);

  function updateField(service: LiveOperationServiceKey, key: string, value: string) {
    setForms((previous) => ({
      ...previous,
      [service]: {
        ...previous[service],
        [key]: value
      }
    }));
  }

  async function postStage(service: LiveOperationServiceStatus, stage: "dry-run" | "approve" | "execute" | "cancel") {
    const current = results[service.key];
    const form = forms[service.key];
    const targetName = summarizeCommand(service.key, form);
    const body = {
      service: service.key,
      stage,
      dryRunId: current?.dryRunId,
      approvalConfirmation: stage === "approve" || stage === "execute" ? "OWNER APPROVES" : "",
      actionType: form.actionType || queueLabels[service.key],
      targetName,
      targetId: form.selectedEmail || form.folderOrFileName || form.taskTitle || "",
      oldValue: "",
      newValue: commandNewValue(service.key, form),
      reason: commandReason(service.key, form)
    };

    const response = await fetch("/api/live-operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();

    setResults((previous) => ({
      ...previous,
      [service.key]: {
        service: service.key,
        message: payload.error || payload.result || (payload.dryRunId ? "Dry-run plan generated and logged." : payload.approved ? "Approved for one execution." : payload.cancelled ? "Held." : "Done."),
        dryRunId: payload.dryRunId || current?.dryRunId,
        approved: Boolean(payload.approved || current?.approved),
        blocked: !response.ok,
        plan: payload.plan || current?.plan
      }
    }));
  }

  if (loading) return <LoadingState label="Loading live operations center..." />;
  if (error) return <ErrorState message={error} />;
  if (!status) return <EmptyState title="No live operations status" message="The live operations control layer did not return a status." />;

  return (
    <div className="view-stack">
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Operations Gate</p>
            <h2>{status.liveOperationsEnabled ? "Live operations enabled" : "Live operations disabled"}</h2>
          </div>
          <ShieldCheck size={20} aria-hidden />
        </div>
        <div className="operation-summary-grid">
          <span><strong>Dry-run Required</strong><StatusBadge label={status.dryRunRequired ? "Yes" : "No"} /></span>
          <span><strong>Owner Approval Required</strong><StatusBadge label={status.ownerApprovalRequired ? "Yes" : "No"} /></span>
          <span><strong>Audit Logging</strong><StatusBadge label={status.auditLoggingEnabled ? "Enabled" : "Blocked"} /></span>
          <span><strong>Audit Tab</strong><StatusBadge label={status.auditTab} /></span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pending Approvals</p>
            <h2>Owner command forms</h2>
          </div>
          <ClipboardCheck size={20} aria-hidden />
        </div>
        <div className="operation-service-grid">
          {services.map((service) => {
            const Icon = serviceIcons[service.key];
            const result = results[service.key];
            const fields = serviceFields[service.key];

            return (
              <article className="operation-card" key={service.key}>
                <header>
                  <Icon size={19} aria-hidden />
                  <div>
                    <p className="eyebrow">{queueLabels[service.key]}</p>
                    <h3>{service.label}</h3>
                  </div>
                  <StatusBadge label={serviceTone(service)} />
                </header>
                <p>{service.blocked ? `Blocked: ${service.missing.join("; ")}` : "Fill out the owner command form, generate a dry-run plan, approve it, then execute that approved action."}</p>

                <div className="operation-form-grid">
                  {fields.map((field) => {
                    const id = inputId(service.key, field.key);
                    const value = forms[service.key][field.key] || "";

                    return (
                      <label className={field.type === "textarea" ? "operation-field wide" : "operation-field"} key={field.key} htmlFor={id}>
                        <span>{field.label}</span>
                        {field.type === "textarea" ? (
                          <textarea id={id} value={value} placeholder={field.placeholder} onChange={(event) => updateField(service.key, field.key, event.target.value)} />
                        ) : (
                          <input id={id} type={field.type || "text"} value={value} placeholder={field.placeholder} onChange={(event) => updateField(service.key, field.key, event.target.value)} />
                        )}
                      </label>
                    );
                  })}
                </div>

                {result?.plan ? (
                  <div className="operation-plan" aria-live="polite">
                    <p className="eyebrow">Dry-run plan</p>
                    <dl>
                      <div><dt>Service</dt><dd>{result.plan.service}</dd></div>
                      <div><dt>Action</dt><dd>{result.plan.actionType}</dd></div>
                      <div><dt>Target</dt><dd>{result.plan.targetName || "Not set"}</dd></div>
                      <div><dt>New value</dt><dd>{result.plan.newValue || "Not set"}</dd></div>
                      <div><dt>Excluded</dt><dd>{result.plan.forbiddenActionsExcluded.join(", ")}</dd></div>
                    </dl>
                  </div>
                ) : null}

                <div className="operation-actions">
                  <button type="button" className="icon-text-button" onClick={() => postStage(service, "dry-run")}><PlayCircle size={16} />Generate Dry Run</button>
                  <button type="button" className="icon-text-button" disabled={!result?.dryRunId} onClick={() => postStage(service, "approve")}><CheckCircle2 size={16} />Approve</button>
                  <button type="button" className="icon-text-button" disabled={!result?.dryRunId || !result.approved} onClick={() => postStage(service, "execute")}><ShieldCheck size={16} />Execute Approved Action</button>
                  <button type="button" className="icon-text-button" onClick={() => postStage(service, "cancel")}><XCircle size={16} />Cancel/Hold</button>
                </div>
                {result ? <p className={result.blocked ? "operation-result blocked" : "operation-result"}>{result.message}</p> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live Operations Audit</p>
            <h2>Every dry-run, approval, and execution is logged when Sheets write is available</h2>
          </div>
        </div>
        <p className="muted-line">No delete actions, permission changes, message sends, tenant/legal/payment actions, or uncontrolled Sheet overwrites are available from this center.</p>
      </section>
    </div>
  );
}
