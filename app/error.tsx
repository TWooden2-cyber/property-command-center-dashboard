"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="loading-page">
      <p className="eyebrow">System notice</p>
      <h1>Something interrupted the dashboard.</h1>
      <p className="muted-line">The private dashboard hit a recoverable rendering error.</p>
      <button className="button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
