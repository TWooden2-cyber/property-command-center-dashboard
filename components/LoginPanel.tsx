"use client";

import { useState, type FormEvent } from "react";
import { Building2, LockKeyhole, ShieldCheck } from "lucide-react";

type LoginPanelProps = {
  authReady: boolean;
  callbackUrl: string;
  reason?: string;
  setup: {
    dashboardOwnerPasswordConfigured: boolean;
    dashboardSessionSecretConfigured: boolean;
    dashboardAccessConfigured: boolean;
    loginMethod: "Owner Password";
  };
};

function statusLabel(configured: boolean) {
  return configured ? "Configured" : "Missing";
}

export function LoginPanel({ authReady, callbackUrl, reason, setup }: LoginPanelProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(reason === "setup" ? "Dashboard owner password setup is incomplete." : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password, callbackUrl })
      });
      const result = (await response.json()) as { ok?: boolean; error?: string; redirectTo?: string };

      if (!response.ok || !result.ok) {
        setError(result.error || "Owner password login failed.");
        return;
      }

      window.location.assign(result.redirectTo || "/");
    } catch {
      setError("Owner password login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <Building2 size={24} aria-hidden />
        </div>
        <p className="eyebrow">Owner-only access</p>
        <h1>Property Command Center Login</h1>
        <p className="login-copy">Owner access only. Enter the owner dashboard password to continue.</p>
        <div className="login-assurance">
          <span>
            <LockKeyhole size={16} aria-hidden />
            No public dashboard access
          </span>
          <span>
            <ShieldCheck size={16} aria-hidden />
            Local Sample Mode
          </span>
        </div>
        {!authReady ? (
          <div className="warning-note">
            Dashboard access control is enabled but setup is incomplete. Add DASHBOARD_OWNER_PASSWORD and a session signing secret before production login.
          </div>
        ) : null}
        {error ? <div className="warning-note">{error}</div> : null}
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              disabled={!authReady || submitting}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <button className="button-primary login-button" type="submit" disabled={!authReady || submitting || password.length === 0}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="settings-lines">
          <div className="mode-status-list">
            <span>Login Method: <strong>{setup.loginMethod}</strong></span>
          </div>
          <div className="mode-status-list">
            <span>Owner Password: <strong>{statusLabel(setup.dashboardOwnerPasswordConfigured)}</strong></span>
          </div>
          <div className="mode-status-list">
            <span>Session Signing Secret: <strong>{statusLabel(setup.dashboardSessionSecretConfigured)}</strong></span>
          </div>
        </div>
      </section>
    </main>
  );
}
