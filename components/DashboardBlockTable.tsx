"use client";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import type { DashboardBlock, DashboardBlockRow } from "@/types/sheets";

type DashboardBlockTableProps = {
  block?: DashboardBlock | null;
  emptyMessage?: string;
};

export function DashboardBlockTable({ block, emptyMessage = "No Dashboard range data is available yet." }: DashboardBlockTableProps) {
  if (!block || !block.rows.length) {
    return (
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dashboard range</p>
            <h2>{block?.title ?? "Dashboard"}</h2>
          </div>
        </div>
        <p className="muted-line">{block?.warning || block?.error || emptyMessage}</p>
      </section>
    );
  }

  const columns: DataTableColumn<DashboardBlockRow>[] = block.headers.map((header, index) => ({
    key: `${block.key}-${index}`,
    header,
    render: (row) => row.cells[index] || ""
  }));

  return (
    <section className="section-block dashboard-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{block.range}</p>
          <h2>{block.title}</h2>
        </div>
      </div>
      <DataTable rows={block.rows} columns={columns} />
    </section>
  );
}
