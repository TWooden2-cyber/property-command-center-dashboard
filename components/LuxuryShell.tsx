"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
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
  FileCheck2,
  FolderKanban,
  ShieldCheck,
  RadioTower,
  PlugZap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type ProductHealth = {
  product: string;
  connected: boolean;
  mode: string;
  status: "live" | "error" | "not_enabled" | "not_configured";
  message: string;
  errorCode?: string | null;
};

function productLabel(product: ProductHealth) {
  if (product.connected) return "Live read-only";
  if (product.errorCode) return product.errorCode;
  if (product.status === "not_configured") return "Not configured";
  if (product.status === "not_enabled") return "Not enabled";
  return "Error";
}

function productRecoveryLabel(product: ProductHealth) {
  if (product.product === "Google Sheets") {
    if (product.errorCode === "permission denied") return "Google Sheets service-account access required";
    if (product.errorCode === "env var missing" || product.errorCode === "Vercel production env mismatch") {
      return "Google Sheets production env fix required";
    }
    return "Google Sheets service-account check failed";
  }

  return `${product.product} disconnected - reconnect required`;
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
  { href: "/owner-approvals", label: "Owner Approvals", icon: FileCheck2 },
  { href: "/task-automation", label: "Task Automation", icon: Bot },
  { href: "/maintenance", label: "Maintenance", icon: Hammer },
  { href: "/utilities", label: "Utilities", icon: Zap },
  { href: "/expenses", label: "Expenses / NOI", icon: DollarSign },
  { href: "/mortgage-arrears", label: "Mortgage & Arrears", icon: Landmark },
  { href: "/admin-tasks", label: "Admin Tasks", icon: ClipboardList },
  { href: "/calendar-follow-ups", label: "Calendar & Follow-Ups", icon: CalendarClock },
  { href: "/lease-violations", label: "Lease Violations", icon: FileWarning },
  { href: "/drive-update-center", label: "Drive System", icon: FolderKanban },
  { href: "/google-connection-center", label: "Google Connections", icon: PlugZap },
  { href: "/data-accuracy", label: "Data Accuracy", icon: ShieldCheck },
  { href: "/live-operations", label: "Live Operations", icon: RadioTower },
  { href: "/settings", label: "Settings", icon: Settings }
] satisfies readonly NavItem[];

const hiddenSidebarRoutes = new Set([
  "/draft-status",
  "/drive-readonly",
  "/final-integration",
  "/gmail-follow-ups",
  "/reports",
  "/live-readiness",
  "/real-data-cleanup",
  "/operations-readiness"
]);

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
  const brokenProducts = products.filter((product) => !product.connected);

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
          {navigation.filter((item) => !hiddenSidebarRoutes.has(item.href)).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link key={item.href} href={item.href as Route} className={active ? "nav-item active" : "nav-item"}>
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
        {brokenProducts.length ? (
          <section className="local-mode-banner" aria-label="Google products operational status">
            <strong>Google connection issue</strong>
            <span>{healthMessage} {brokenProducts.map(productRecoveryLabel).join(" | ")}</span>
            <div className="source-badges">
              {products.map((product) => (
                <span key={product.product} className={`status-pill ${productTone(product)}`} title={product.message}>
                  {product.product}: {productLabel(product)}
                </span>
              ))}
              <Link className="status-pill blue" href="/google-connection-center">
                Open Connection Center
              </Link>
            </div>
          </section>
        ) : null}
        {children}
      </main>
    </div>
  );
}
