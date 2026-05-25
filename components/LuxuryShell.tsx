"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Gauge,
  Hammer,
  Landmark,
  MailWarning,
  ReceiptText,
  Settings,
  CalendarClock,
  DollarSign,
  Zap,
  FileWarning,
  FileText,
  FolderUp,
  Mail,
  BarChart3,
  ShieldCheck,
  Route as RouteIcon,
  Database,
  ListChecks,
  HardDrive
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

const navigation = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/rent-collection", label: "Rent Collection", icon: ReceiptText },
  { href: "/notices-evictions", label: "Notices & Evictions", icon: MailWarning },
  { href: "/maintenance", label: "Maintenance", icon: Hammer },
  { href: "/utilities", label: "Utilities", icon: Zap },
  { href: "/expenses", label: "Expenses / NOI", icon: DollarSign },
  { href: "/mortgage-arrears", label: "Mortgage & Arrears", icon: Landmark },
  { href: "/admin-tasks", label: "Admin Tasks", icon: ClipboardList },
  { href: "/calendar-follow-ups", label: "Calendar & Follow-Ups", icon: CalendarClock },
  { href: "/lease-violations", label: "Lease Violations", icon: FileWarning },
  { href: "/draft-status", label: "Draft Status", icon: FileText },
  { href: "/drive-update-center", label: "Drive Update Center", icon: FolderUp },
  { href: "/drive-readonly", label: "Drive Read-Only", icon: HardDrive },
  { href: "/gmail-follow-ups", label: "Gmail Follow-Ups", icon: Mail },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/data-accuracy", label: "Data Accuracy", icon: ShieldCheck },
  { href: "/live-readiness", label: "Live Readiness", icon: RouteIcon },
  { href: "/real-data-cleanup", label: "Real Data Cleanup", icon: Database },
  { href: "/operations-readiness", label: "Operations Readiness", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings }
] satisfies readonly NavItem[];

export function LuxuryShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="sidebar-brand">
          <span className="brand-emblem">PM</span>
          <span>
            <strong>Owner Command</strong>
            <small>Master Tracker</small>
          </span>
        </Link>

        <nav className="nav-list" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"}>
                <Icon size={18} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="session-email">Local owner mode</span>
          <Link className="icon-text-button" href="/login">
            Sample data only
          </Link>
        </div>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Local Owner Operations</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="security-chip">Local read-only sample mode</div>
        </header>
        <section className="local-mode-banner" aria-label="Local sample mode notice">
          <strong>Local Sample Mode</strong>
          <span>No live Google data or live actions.</span>
        </section>
        {children}
      </main>
    </div>
  );
}
