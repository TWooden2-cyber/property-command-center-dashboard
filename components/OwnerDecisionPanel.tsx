import { Crown } from "lucide-react";

export function OwnerDecisionPanel({ decision }: { decision: string }) {
  return (
    <section className="decision-panel">
      <div className="panel-icon">
        <Crown size={20} aria-hidden />
      </div>
      <div>
        <p className="eyebrow">Owner Decision Today</p>
        <h2>{decision}</h2>
      </div>
    </section>
  );
}
