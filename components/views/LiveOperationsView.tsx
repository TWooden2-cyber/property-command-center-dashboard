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

function serviceTone(service: LiveOperationServiceStatus) {
  if (service.enabled && !service.blocked) return "Enabled";
  if (service.enabled && service.blocked) return "Blocked";
  return "Disabled";
}

export function LiveOperationsView() {
  const [status, setStatus] = useState<LiveOperationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  async function postStage(service: LiveOperationServiceStatus, stage: "dry-run" | "approve" | "execute" | "cancel") {
    const current = results[service.key];
    const body = {
      service: service.key,
      stage,
      dryRunId: current?.dryRunId,
      approvalConfirmation: stage === "approve" || stage === "execute" ? "OWNER APPROVES" : "",
      actionType: queueLabels[service.key],
      targetName: service.label,
      reason: "Owner reviewed live operations center action card."
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
        message: payload.error || payload.result || (payload.dryRunId ? "Dry-run generated." : payload.approved ? "Approved." : payload.cancelled ? "Held." : "Done."),
        dryRunId: payload.dryRunId || current?.dryRunId,
        approved: Boolean(payload.approved || (stage === "approve" && response.ok)),
        blocked: !response.ok
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
            <h2>Owner-controlled workflow</h2>
          </div>
          <ClipboardCheck size={20} aria-hidden />
        </div>
        <div className="operation-service-grid">
          {services.map((service) => {
            const Icon = serviceIcons[service.key];
            const result = results[service.key];

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
                <p>{service.blocked ? `Blocked: ${service.missing.join("; ")}` : "Ready for dry-run, owner approval, and a single approved execution."}</p>
                <div className="operation-tags">
                  {service.allowedActions.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
                </div>
                <div className="operation-actions">
                  <button type="button" className="icon-text-button" onClick={() => postStage(service, "dry-run")}><PlayCircle size={16} />Generate Dry Run</button>
                  <button type="button" className="icon-text-button" onClick={() => postStage(service, "approve")}><CheckCircle2 size={16} />Approve</button>
                  <button type="button" className="icon-text-button" onClick={() => postStage(service, "execute")}><ShieldCheck size={16} />Execute Approved Action</button>
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
            <h2>Every dry-run and execution is logged when Sheets write is available</h2>
          </div>
        </div>
        <p className="muted-line">No delete actions, permission changes, message sends, tenant/legal/payment actions, or uncontrolled Sheet overwrites are available from this center.</p>
      </section>
    </div>
  );
}
