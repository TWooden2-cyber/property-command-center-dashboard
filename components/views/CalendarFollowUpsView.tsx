"use client";

import { Clock } from "lucide-react";
import { DashboardBlockTable } from "@/components/DashboardBlockTable";
import { SheetsRefreshStatus } from "@/components/SheetsRefreshStatus";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/formatters";
import type { CalendarFollowUpRecord, DashboardBlock } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type CalendarPayload = {
  groups: Record<CalendarFollowUpRecord["group"], CalendarFollowUpRecord[]>;
  dashboardBlock?: DashboardBlock;
};

const groupOrder: CalendarFollowUpRecord["group"][] = ["Overdue", "Today", "This Week", "Later"];

export function CalendarFollowUpsView() {
  const { data, system, error, loading } = useSheetsView<CalendarPayload>("calendar-follow-ups");

  if (loading) {
    return <LoadingState label="Loading calendar and follow-ups..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const total = data ? Object.values(data.groups).reduce((sum, group) => sum + group.length, 0) : 0;

  if (!data || (total === 0 && !data.dashboardBlock?.rows.length)) {
    return <EmptyState title="No upcoming follow-ups" message="The Calendar & Follow-Ups tab and Dashboard follow-up range are empty or have no dated items." />;
  }

  return (
    <div className="followup-groups">
      <SheetsRefreshStatus system={system} />
      <DashboardBlockTable block={data.dashboardBlock} />
      {data.dashboardBlock?.rows.length ? null : groupOrder.map((group) => (
        <section key={group} className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Follow-ups</p>
              <h2>{group}</h2>
            </div>
            <StatusBadge label={group === "Overdue" ? "Critical" : group === "Today" ? "High" : "Normal"} />
          </div>

          {data.groups[group].length === 0 ? (
            <p className="muted-line">No items in this group.</p>
          ) : (
            <div className="followup-list">
              {data.groups[group].map((item) => (
                <article key={item.id} className="followup-item">
                  <div className="followup-date">
                    <Clock size={16} aria-hidden />
                    <span>{formatDate(item.date)}</span>
                    {item.time ? <small>{item.time}</small> : null}
                  </div>
                  <div>
                    <h3>{item.item || item.category || "Follow-up"}</h3>
                    <p>
                      {[item.property, item.unit, item.tenant].filter(Boolean).join(" / ") || "Portfolio-level item"}
                    </p>
                    {item.notes ? <small>{item.notes}</small> : null}
                  </div>
                  <StatusBadge label={item.status || group} />
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
