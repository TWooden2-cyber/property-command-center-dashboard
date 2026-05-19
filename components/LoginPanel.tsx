"use client";

import { signIn } from "next-auth/react";
import { Building2, LockKeyhole, ShieldCheck } from "lucide-react";

export function LoginPanel() {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <Building2 size={24} aria-hidden />
        </div>
        <p className="eyebrow">Private owner access</p>
        <h1>Property Management Owner Command Center</h1>
        <p className="login-copy">
          Secure read-only access to the private Master Tracker. Google login is restricted to the approved owner email.
        </p>
        <div className="login-assurance">
          <span>
            <LockKeyhole size={16} aria-hidden />
            Login required
          </span>
          <span>
            <ShieldCheck size={16} aria-hidden />
            Read-only
          </span>
        </div>
        <button className="button-primary login-button" onClick={() => signIn("google", { callbackUrl: "/" })}>
          Continue with Google
        </button>
      </section>
    </main>
  );
}
