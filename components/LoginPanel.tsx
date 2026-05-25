"use client";

import { signIn } from "next-auth/react";
import { Building2, LockKeyhole, ShieldCheck } from "lucide-react";

type LoginPanelProps = {
  authReady: boolean;
  setup: {
    authSecretConfigured: boolean;
    authUrlConfigured: boolean;
    googleClientIdConfigured: boolean;
    googleClientSecretConfigured: boolean;
    allowedOwnerEmailsConfigured: boolean;
    allowedOwnerEmailCount: number;
  };
};

function statusLabel(configured: boolean) {
  return configured ? "Configured" : "Missing";
}

export function LoginPanel({ authReady, setup }: LoginPanelProps) {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <Building2 size={24} aria-hidden />
        </div>
        <p className="eyebrow">Owner-only access</p>
        <h1>Property Command Center Login</h1>
        <p className="login-copy">
          Owner access required. Sign in with an approved Google account before opening the dashboard.
        </p>
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
            Dashboard access control is enabled but setup is incomplete. Add the required auth environment variables before production login.
          </div>
        ) : null}
        <button className="button-primary login-button" type="button" disabled={!authReady} onClick={() => signIn("google", { callbackUrl: "/" })}>
          Sign in with Google
        </button>
        <div className="settings-lines">
          <div className="mode-status-list">
            <span>Google Client ID: <strong>{statusLabel(setup.googleClientIdConfigured)}</strong></span>
          </div>
          <div className="mode-status-list">
            <span>Google Client Secret: <strong>{statusLabel(setup.googleClientSecretConfigured)}</strong></span>
          </div>
          <div className="mode-status-list">
            <span>Auth Secret: <strong>{statusLabel(setup.authSecretConfigured)}</strong></span>
          </div>
          <div className="mode-status-list">
            <span>Allowed Owner Emails: <strong>{setup.allowedOwnerEmailsConfigured ? `${setup.allowedOwnerEmailCount} configured` : "Missing"}</strong></span>
          </div>
        </div>
      </section>
    </main>
  );
}
