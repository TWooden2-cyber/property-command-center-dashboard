import type { RiskLevel } from "@/types/sheets";

const criticalLabels = [
  "Critical",
  "Emergency",
  "Unpaid",
  "Needs Follow-Up",
  "Prepare Filing Packet",
  "Deadline Expired",
  "Usage Spike"
];
const highLabels = ["High", "Partial", "Proof Missing", "Deadline Approaching", "Owner Review Required", "Needs Review", "Missing Bill"];
const stableLabels = ["Paid", "AutoPay", "Complete", "Stable", "Resolved", "Notice Served / Countdown Active"];
const watchLabels = ["Waiting", "Owner Review", "Payment Arrangement Active", "Watch", "Needs Entry", "Disputed"];

function toneFor(label: string | RiskLevel): string {
  if (criticalLabels.includes(label)) {
    return "critical";
  }

  if (highLabels.includes(label)) {
    return "high";
  }

  if (watchLabels.includes(label)) {
    return "watch";
  }

  if (stableLabels.includes(label)) {
    return "stable";
  }

  return "neutral";
}

export function StatusBadge({ label }: { label: string | RiskLevel }) {
  return <span className={`status-badge status-${toneFor(label)}`}>{label || "Not set"}</span>;
}
