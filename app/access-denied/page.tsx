import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getAuthSetupStatus } from "@/lib/authConfig";

export default function AccessDeniedPage() {
  const setup = getAuthSetupStatus();

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <ShieldAlert size={24} aria-hidden />
        </div>
        <p className="eyebrow">Owner-only access</p>
        <h1>Access denied</h1>
        <p className="login-copy">Access denied — this Google account is not authorized.</p>
        <p className="login-copy">Ask the owner to add the email to ALLOWED_OWNER_EMAILS. Dashboard data is not shown on this page.</p>
        {!setup.allowedOwnerEmailsConfigured ? (
          <div className="warning-note">
            ALLOWED_OWNER_EMAILS is missing or empty. The dashboard is failing closed until owner emails are configured.
          </div>
        ) : null}
        <div className="login-assurance">
          <span>Public access disabled</span>
          <span>API protection enabled</span>
          <span>Allowed emails: {setup.allowedOwnerEmailCount ? `${setup.allowedOwnerEmailCount} configured` : "Missing"}</span>
        </div>
        <Link className="button-primary login-button" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}
