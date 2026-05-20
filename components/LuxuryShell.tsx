"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ClipboardList,
  Gauge,
  Hammer,
  Landmark,
  LogOut,
  MailWarning,
  ReceiptText,
  Settings,
  CalendarClock,
  DollarSign,
  Zap
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
  const { data: session } = useSession();

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
          <span className="session-email">{session?.user?.email ?? "Owner session"}</span>
          <button className="icon-text-button" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut size={16} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Live Owner Operations</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="security-chip">Private read-only system</div>
        </header>
        {children}
      </main>
    </div>
  );
}
