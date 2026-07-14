"use client";

import { useMemo, useState } from "react";
import { Bot, CalendarDays, Copy, FolderKanban, Mail, RefreshCw } from "lucide-react";

const defaultMonitoringPrompt = `Run the Property Management Monitoring Resource Update.

Scope:
- Gmail organization and intake monitoring
- Google Calendar deadline and follow-up monitoring
- Google Drive document organization review
- Owner Approval Queue monitoring
- Maintenance, rent, legal, utilities, and activity-log monitoring

Rules:
- Read/check/classify only unless I separately approve a live action.
- Do not send Gmail, create Gmail drafts, archive, label, delete, or forward email unless separately approved.
- Do not move, rename, delete, upload, or share Google Drive files unless separately approved.
- Do not create, update, or delete Calendar events or Google Tasks unless separately approved.
- Do not update Google Sheets, trackers, ledgers, legal status, tenant records, vendor records, payments, notices, or filings unless separately approved.

Return:
- Monitoring resources checked
- Items needing owner approval
- Gmail organization recommendations
- Calendar reminders/follow-ups recommended
- Drive organization recommendations
- Blocked items and missing connection errors
- Proposed tracker/dashboard updates, without writing them
- Exact next approval prompt needed for Codex to execute approved updates`;

const automationSections = [
  {
    id: "gmail",
    icon: Mail,
    title: "Gmail Organization",
    detail: "Review intake, follow-ups, RentRedi notices, Google Voice notifications, and owner-approval emails.",
    prompt:
      "Check Gmail read-only intake and organization. Identify property-related emails, duplicates, missing labels/folders, follow-ups, draft-needed items, and owner approvals needed. Do not send, draft, label, archive, delete, or forward anything."
  },
  {
    id: "calendar",
    icon: CalendarDays,
    title: "Calendar Monitoring",
    detail: "Review deadlines, rent follow-ups, notice windows, maintenance appointments, legal dates, and utility due dates.",
    prompt:
      "Check calendar and deadline monitoring. Identify missed dates, upcoming owner decisions, maintenance/vendor follow-ups, rent/legal/utility deadlines, and recommended reminders. Do not create, update, or delete Calendar events or Tasks."
  },
  {
    id: "drive",
    icon: FolderKanban,
    title: "Google Drive Organization",
    detail: "Review folders, proof files, owner approval documents, utilities, notices, leases, invoices, and missing proof.",
    prompt:
      "Check Google Drive organization read-only. Identify missing folders, misplaced documents, duplicate/uncertain files, owner approval documents, proof gaps, and recommended filing actions. Do not move, rename, delete, upload, or share files."
  }
];

export function TaskAutomationView() {
  const [prompt, setPrompt] = useState(defaultMonitoringPrompt);
  const [confirmation, setConfirmation] = useState("");

  const combinedPrompt = useMemo(() => {
    return [
      prompt.trim(),
      "",
      "Focused checks:",
      ...automationSections.map((section) => `- ${section.title}: ${section.prompt}`)
    ].join("\n");
  }, [prompt]);

  async function copyPrompt(value: string, message: string) {
    await navigator.clipboard?.writeText(value);
    setConfirmation(message);
  }

  return (
    <div className="view-stack task-automation-page">
      <section className="section-block task-automation-hero">
        <div>
          <p className="eyebrow">Task Automation</p>
          <h2>Monitoring resource update prompt</h2>
          <p>
            Use this page to generate one owner-controlled prompt for Gmail organization, Calendar monitoring, Google Drive organization,
            approval queue review, and tracker update previews.
          </p>
        </div>
        <button type="button" className="button-primary" onClick={() => void copyPrompt(combinedPrompt, "Monitoring prompt copied.")}>
          <Copy size={17} aria-hidden />
          Copy Monitoring Prompt
        </button>
      </section>

      {confirmation ? <div className="approval-confirmation">{confirmation}</div> : null}

      <section className="task-automation-grid">
        {automationSections.map((section) => {
          const Icon = section.icon;
          return (
            <article className="task-automation-card" id={section.id} key={section.id}>
              <header>
                <Icon size={21} aria-hidden />
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.detail}</p>
                </div>
              </header>
              <textarea value={section.prompt} readOnly aria-label={`${section.title} prompt`} />
              <button type="button" onClick={() => void copyPrompt(section.prompt, `${section.title} prompt copied.`)}>
                <Copy size={15} aria-hidden />
                Copy Section Prompt
              </button>
            </article>
          );
        })}
      </section>

      <section className="section-block task-master-prompt">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Master Prompt</p>
            <h2>Update all monitoring resources</h2>
          </div>
          <button type="button" onClick={() => setPrompt(defaultMonitoringPrompt)}>
            <RefreshCw size={15} aria-hidden />
            Reset
          </button>
        </div>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Task automation monitoring prompt" />
        <div className="task-prompt-actions">
          <button type="button" className="button-primary" onClick={() => void copyPrompt(combinedPrompt, "Full monitoring prompt copied.")}>
            <Bot size={17} aria-hidden />
            Copy Full Prompt
          </button>
          <span>Owner approval required before any live Gmail, Drive, Calendar, Task, Sheet, tenant, vendor, legal, or payment action.</span>
        </div>
      </section>
    </div>
  );
}
