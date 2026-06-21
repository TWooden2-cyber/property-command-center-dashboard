import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { getWorkbookSnapshot, isLocalSampleModeAllowed } from "@/lib/googleSheets";
import { sampleWorkbookSnapshot } from "@/lib/sampleWorkbook";
import { parseWorkbook } from "@/lib/sheetParsers";

type DraftRow = {
  id: string;
  source: string;
  property: string;
  unit: string;
  item: string;
  status: string;
  nextAction: string;
};

function includesDraftText(...values: string[]) {
  const text = values.join(" ").toLowerCase();
  return ["draft", "packet", "notice", "email", "document", "form", "filing"].some((term) => text.includes(term));
}

function buildDraftRows(): Promise<{ rows: DraftRow[]; source: string; error: string | null }> {
  return (async () => {
    try {
      const snapshot = isLocalSampleModeAllowed() ? sampleWorkbookSnapshot : await getWorkbookSnapshot();
      const data = parseWorkbook(snapshot);
      const rows: DraftRow[] = [];

      for (const task of data.adminTasks) {
        if (!includesDraftText(task.task, task.notes, task.status, task.emailNeeded, task.driveLink)) continue;
        rows.push({
          id: `admin-${task.id}`,
          source: "Admin Task Log",
          property: task.property,
          unit: task.unit,
          item: task.task,
          status: task.status,
          nextAction: task.notes || task.emailNeeded || "Owner review required"
        });
      }

      for (const notice of data.noticesEvictions) {
        if (!includesDraftText(notice.noticeType, notice.courtFilingStatus, notice.notes, notice.nextOwnerAction, notice.mailingNotes)) continue;
        rows.push({
          id: `notice-${notice.id}`,
          source: "Notices & Evictions",
          property: notice.property,
          unit: notice.unit,
          item: `${notice.tenant} - ${notice.noticeType}`,
          status: notice.courtFilingStatus || notice.caseStage,
          nextAction: notice.nextOwnerAction || notice.notes || "Owner review required"
        });
      }

      return {
        rows,
        source: isLocalSampleModeAllowed() ? "Local development sample" : "Live Google Sheets",
        error: null
      };
    } catch (error) {
      return {
        rows: [],
        source: "Live data unavailable",
        error: error instanceof Error ? error.message : "Draft Status live source could not be read."
      };
    }
  })();
}

export default async function DraftStatusPage() {
  await requireOwnerSession();
  const { rows, source, error } = await buildDraftRows();

  return (
    <LuxuryShell title="Draft Status" subtitle="Read-only draft/document status from live Sheets sources. Gmail drafts are not accessed.">
      <div className="remaining-command-page">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Draft Status Source</p>
              <h2>Read-only live source review</h2>
            </div>
            <span className={`status-pill ${source === "Live Google Sheets" ? "green" : error ? "red" : "yellow"}`}>{source}</span>
          </div>
          <p>
            This page only reads draft-related rows from Admin Task Log and Notices & Evictions. It does not read Gmail message bodies,
            create drafts, send messages, or modify documents.
          </p>
          {error ? <p className="error-text">{error}</p> : null}
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Live Rows</p>
              <h2>Draft-related items</h2>
            </div>
            <span className="status-pill yellow">{rows.length ? `${rows.length} rows` : "No live draft rows found"}</span>
          </div>
          {rows.length ? (
            <div className="live-table-wrap">
              <table className="live-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Property</th>
                    <th>Unit</th>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.source || "Not mapped"}</td>
                      <td>{row.property || "Not mapped"}</td>
                      <td>{row.unit || "Not mapped"}</td>
                      <td>{row.item || "Not mapped"}</td>
                      <td>{row.status || "Live value unavailable"}</td>
                      <td>{row.nextAction || "Live value unavailable"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Draft Status live source not configured as a dedicated tab. No Gmail draft metadata is read in this mode.</p>
          )}
        </section>
      </div>
    </LuxuryShell>
  );
}
