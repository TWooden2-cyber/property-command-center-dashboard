"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import type { GoogleProductStatus } from "@/types/googleProducts";

type Payload = {
  ok: boolean;
  checkedAt: string;
  products: GoogleProductStatus[];
  error?: string;
};

function tone(product: GoogleProductStatus) {
  if (product.connected) return "green";
  if (product.status === "error") return "red";
  return "yellow";
}

function label(product: GoogleProductStatus) {
  if (product.connected && product.product === "Gmail") return "Live Metadata Only";
  if (product.connected) return product.product === "Google Sheets" ? "Live" : "Live Read-Only";
  if (product.status === "not_configured") return "Not Configured";
  if (product.status === "not_enabled") return "Not Enabled";
  return "Error";
}

export function GoogleProductsStatusPanel({ title = "Google Products Read-Only Status" }: { title?: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/google/products/status", { cache: "no-store" });
        const body = (await response.json()) as Payload;
        if (!mounted) return;
        if (!response.ok && !body.products) {
          setError(body.error || "Google product status is unavailable.");
          return;
        }
        setPayload(body);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError instanceof Error ? requestError.message : "Google product status is unavailable.");
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Source status</p>
            <h2>{title}</h2>
          </div>
          <span className="status-pill red">Error</span>
        </div>
        <p>{error}</p>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Source status</p>
            <h2>{title}</h2>
          </div>
          <span className="status-pill yellow">Checking</span>
        </div>
        <p>Checking live read-only Google product status...</p>
      </section>
    );
  }

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Source status</p>
          <h2>{title}</h2>
        </div>
        <span className="status-pill green">Read-only policy active</span>
      </div>
      <div className="source-grid">
        {payload.products.map((product) => (
          <article className="source-card" key={product.product}>
            <div>
              {product.connected ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <strong>{product.product}</strong>
            </div>
            <span className={`status-pill ${tone(product)}`}>{label(product)}</span>
            <p>{product.message}</p>
            <small>
              <Clock size={13} /> {product.checkedAt}
            </small>
            {product.missingEnvVars.length > 0 ? <small>Missing: {product.missingEnvVars.join(", ")}</small> : null}
          </article>
        ))}
      </div>
      <div className="remaining-safety-footer">
        <ShieldCheck size={18} />
        <p>Write operations disabled by owner policy. This panel only checks connection status and safe metadata.</p>
      </div>
    </section>
  );
}
