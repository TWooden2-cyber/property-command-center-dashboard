"use client";

import { AlertTriangle, CheckCircle2, CircleDotDashed } from "lucide-react";

export type SectionActionRow = {
  title: string;
  bluf: string;
  issue?: string;
  systemicIssue?: string;
  recourse?: string;
  workLink?: string;
  tone?: "green" | "yellow" | "red";
};

function rowIcon(tone: SectionActionRow["tone"]) {
  if (tone === "green") return <CheckCircle2 size={17} aria-hidden />;
  if (tone === "red") return <AlertTriangle size={17} aria-hidden />;
  return <CircleDotDashed size={17} aria-hidden />;
}

export function SectionActionRows({
  eyebrow = "Section Action Rows",
  title = "What needs attention",
  rows
}: {
  eyebrow?: string;
  title?: string;
  rows: SectionActionRow[];
}) {
  if (!rows.length) {
    return null;
  }

  return (
    <section className="section-block section-action-row-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="section-action-row-list">
        {rows.map((row) => (
          <details key={`${row.title}-${row.bluf}`} className={`section-action-row queue-${row.tone ?? "yellow"}`}>
            <summary>
              <span>{rowIcon(row.tone)}</span>
              <strong>{row.title}</strong>
              <p>{row.bluf}</p>
            </summary>
            <div className="section-action-row-detail">
              {row.issue ? (
                <article>
                  <span>Issue</span>
                  <p>{row.issue}</p>
                </article>
              ) : null}
              {row.systemicIssue ? (
                <article>
                  <span>Systemic Issue</span>
                  <p>{row.systemicIssue}</p>
                </article>
              ) : null}
              {row.recourse ? (
                <article>
                  <span>Recourse</span>
                  <p>{row.recourse}</p>
                </article>
              ) : null}
              {row.workLink ? (
                <article>
                  <span>Work Link</span>
                  {row.workLink.startsWith("http") ? (
                    <a href={row.workLink} target="_blank" rel="noreferrer">
                      Open source record
                    </a>
                  ) : (
                    <p>{row.workLink}</p>
                  )}
                </article>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
