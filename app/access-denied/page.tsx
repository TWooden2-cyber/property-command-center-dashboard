import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <ShieldAlert size={24} aria-hidden />
        </div>
        <p className="eyebrow">Owner-only access</p>
        <h1>Access denied</h1>
        <p className="login-copy">Access denied. Owner password access is required.</p>
        <p className="login-copy">Dashboard data is not shown on this page.</p>
        <div className="login-assurance">
          <span>Public access disabled</span>
          <span>API protection enabled</span>
          <span>Owner access only</span>
        </div>
        <Link className="button-primary login-button" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}
