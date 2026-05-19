"use client";

import { useEffect } from "react";
import "@/styles/globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="loading-page">
          <p className="eyebrow">System notice</p>
          <h1>The command center could not finish loading.</h1>
          <p className="muted-line">Refresh the private owner session and try again.</p>
          <button className="button-primary" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
