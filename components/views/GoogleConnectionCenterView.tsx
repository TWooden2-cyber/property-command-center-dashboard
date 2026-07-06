"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import type { GoogleProductStatus } from "@/types/googleProducts";

type StatusPayload = {
  ok: boolean;
  checkedAt: string;
  products: GoogleProductStatus[];
};

function statusTone(product: GoogleProductStatus) {
  if (product.connected) return "green";
  if (product.errorCode === "scope missing" || product.errorCode === "refresh token missing" || product.errorCode === "token expired") return "red";
  return "amber";
}

function formatList(values: string[]) {
  return values.length ? values.join(", ") : "None";
}

export function GoogleConnectionCenterView() {
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/google/products/status", { cache: "no-store" });
      const data = (await response.json()) as StatusPayload;
      setPayload(data);
      if (!response.ok && !data.products?.length) setError("Google connection status could not be loaded.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Google connection status could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const brokenProducts = useMemo(() => payload?.products.filter((product) => !product.connected) ?? [], [payload]);

  return (
    <div className="connection-center">
      <section className={brokenProducts.length ? "connection-hero warning" : "connection-hero"}>
        <div>
          <p className="eyebrow">Google Connection Center</p>
          <h2>{brokenProducts.length ? "Google reconnect required" : "All Google read-only connections are healthy"}</h2>
          <p>
            Gmail, Drive, Calendar, Tasks, and Sheets are checked here before any intake sync runs. Read-only access is allowed;
            sends, writes, moves, task closures, legal actions, financial actions, and tenant/vendor actions remain blocked without owner approval.
          </p>
        </div>
        <div className="connection-actions">
          <button type="button" onClick={loadStatus} disabled={loading}>
            <RefreshCw size={17} aria-hidden />
            {loading ? "Checking..." : "Run Health Check"}
          </button>
          <a className="primary-action-button" href="/api/google/reconnect">
            <ShieldCheck size={17} aria-hidden />
            Fix / Reconnect Google
          </a>
        </div>
      </section>

      {error ? <div className="connection-alert"><AlertTriangle size={18} aria-hidden />{error}</div> : null}

      <section className="connection-grid" aria-label="Google product statuses">
        {(payload?.products ?? []).map((product) => (
          <article key={product.product} className={`connection-card ${statusTone(product)}`}>
            <header>
              <div>
                <h3>{product.product}</h3>
                <p>{product.mode}</p>
              </div>
              <span>
                {product.connected ? <CheckCircle2 size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
                {product.connected ? "Connected" : product.errorCode || product.status}
              </span>
            </header>
            <dl>
              <div><dt>Connected account</dt><dd>{product.connectedAccountEmail || "Unknown / not connected"}</dd></div>
              <div><dt>Token expiration</dt><dd>{product.tokenExpirationStatus || "Unknown"}</dd></div>
              <div><dt>Missing scopes</dt><dd>{formatList(product.missingScopes || [])}</dd></div>
              <div><dt>Missing env vars</dt><dd>{formatList(product.missingEnvVars || [])}</dd></div>
              <div><dt>Last successful sync</dt><dd>{product.lastSuccessfulSync || "None recorded"}</dd></div>
              <div><dt>Last error message</dt><dd>{product.lastErrorMessage || "None"}</dd></div>
            </dl>
            <p className="connection-message">{product.message}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
