import type { RiskItem } from "@/types/sheets";
import { StatusBadge } from "@/components/StatusBadge";

export function RiskPanel({ risks }: { risks: RiskItem[] }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Today&apos;s Risk Summary</p>
          <h2>Operational exposure</h2>
        </div>
      </div>
      <div className="risk-grid">
        {risks.map((risk) => (
          <article key={risk.label} className="risk-item">
            <div>
              <h3>{risk.label}</h3>
              <p>{risk.summary}</p>
            </div>
            <StatusBadge label={risk.level} />
          </article>
        ))}
      </div>
    </section>
  );
}
