"use client";

import { AlertTriangle, Loader2, SearchX } from "lucide-react";

export function LoadingState({ label = "Loading private tracker data..." }: { label?: string }) {
  return (
    <section className="state-panel">
      <Loader2 className="spin" size={22} aria-hidden />
      <p>{label}</p>
    </section>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <section className="state-panel state-error">
      <AlertTriangle size={22} aria-hidden />
      <p>{message}</p>
    </section>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <section className="state-panel">
      <SearchX size={22} aria-hidden />
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </section>
  );
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) {
    return null;
  }

  return (
    <section className="warning-list">
      <p className="eyebrow">Sheet warnings</p>
      {warnings.slice(0, 6).map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </section>
  );
}
