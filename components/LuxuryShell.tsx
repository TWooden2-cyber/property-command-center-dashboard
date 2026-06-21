"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  RadioTower,
  HardDrive
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

type ProductHealth = {
  product: string;
  connected: boolean;
  mode: string;
  status: "live" | "error" | "not_enabled" | "not_configured";
  message: string;
};

function productLabel(product: ProductHealth) {
  if (product.connected && product.product === "Gmail") return "Live metadata";
  if (product.connected) return "Live read-only";
  if (product.status === "not_configured") return "Not configured";
  if (product.status === "not_enabled") return "Not enabled";
  return "Error";
}

function productTone(product: ProductHealth) {
  if (product.connected) return "green";
  if (product.status === "error") return "red";
  return "yellow";
}

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
  { href: "/final-integration", label: "Final Integration", icon: ClipboardList },
  { href: "/gmail-follow-ups", label: "Gmail Tracking", icon: Mail },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/data-accuracy", label: "Data Accuracy", icon: ShieldCheck },
  { href: "/live-readiness", label: "Live Readiness", icon: RouteIcon },
  { href: "/live-operations", label: "Live Operations", icon: RadioTower },
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
  const [products, setProducts] = useState<ProductHealth[]>([]);
  const [healthMessage, setHealthMessage] = useState("Checking Google product status...");

  useEffect(() => {
    let mounted = true;

    async function loadHealth() {
      try {
        const response = await fetch("/api/google/products/status", { cache: "no-store" });
        const payload = (await response.json()) as { products?: ProductHealth[]; error?: string };
        if (!mounted) return;
        setProducts(payload.products ?? []);
        setHealthMessage(response.ok ? "Operational source status checked." : payload.error ?? "Google product status check reported an error.");
      } catch (error) {
        if (!mounted) return;
        setHealthMessage(error instanceof Error ? error.message : "Unable to load Google product health.");
      }
    }

    loadHealth();

    return () => {
      mounted = false;
    };
  }, []);

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
          <span className="session-email">Owner mode</span>
          <Link className="icon-text-button" href="/login">
            Owner login
          </Link>
        </div>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Live Owner Operations</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="security-chip">Read-only live data mode</div>
        </header>
        <section className="local-mode-banner" aria-label="Google products operational status">
          <strong>Operational Sources</strong>
          <span>{healthMessage}</span>
          <div className="source-badges">
            {products.map((product) => (
              <span key={product.product} className={`status-pill ${productTone(product)}`} title={product.message}>
                {product.product}: {productLabel(product)}
              </span>
            ))}
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}
