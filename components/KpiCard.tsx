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
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}
