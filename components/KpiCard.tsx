import type { RiskLevel } from "@/types/sheets";

export function KpiCard({
  label,
  value,
  helper,
  tone = "Normal"
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: RiskLevel;
}) {
  return (
    <article className={`kpi-card tone-${tone.toLowerCase()}`}>
      <div className="kpi-card-topline">
        <span>{label}</span>
        <i aria-hidden />
      </div>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}
