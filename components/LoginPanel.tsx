import Link from "next/link";
import { Building2, LockKeyhole, ShieldCheck } from "lucide-react";

export function LoginPanel() {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <Building2 size={24} aria-hidden />
        </div>
        <p className="eyebrow">Local owner mode</p>
        <h1>Property Management Owner Command Center</h1>
        <p className="login-copy">
          Google OAuth is temporarily disabled. This local reset uses sample data only and does not connect to live Google services.
        </p>
        <div className="login-assurance">
          <span>
            <LockKeyhole size={16} aria-hidden />
            Local access
          </span>
          <span>
            <ShieldCheck size={16} aria-hidden />
            Read-only sample data
          </span>
        </div>
        <Link className="button-primary login-button" href="/">
          Continue in local owner mode
        </Link>
      </section>
    </main>
  );
}
