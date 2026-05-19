import type { RiskLevel } from "@/types/sheets";

function toneFor(label: string | RiskLevel): string {
  const value = String(label || "").toLowerCase();

  if (["critical", "emergency", "overdue", "unpaid", "deadline expired", "usage spike"].some((term) => value.includes(term))) {
    return "critical";
  }

  if (["proof missing", "missing proof", "waiting", "pending tenant", "pending owner", "needs entry"].some((term) => value.includes(term))) {
    return "watch";
  }

  if (["owner decision", "owner review", "needs review", "approval required", "high", "deadline approaching"].some((term) => value.includes(term))) {
    return "high";
  }

  if (["scheduled", "follow-up", "follow up", "calendar"].some((term) => value.includes(term))) {
    return "info";
  }

  if (["closed", "archived"].some((term) => value.includes(term))) {
    return "archived";
  }

  if (["complete", "completed", "verified", "paid", "autopay", "stable", "resolved"].some((term) => value.includes(term))) {
    return "stable";
  }

  return "neutral";
}

export function StatusBadge({ label }: { label: string | RiskLevel }) {
  return <span className={`status-badge status-${toneFor(label)}`}>{label || "Not set"}</span>;
}
