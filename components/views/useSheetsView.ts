"use client";

import { useEffect, useState } from "react";
import type { SheetsView, SystemStatus } from "@/types/sheets";

type ApiEnvelope<T> =
  | {
      ok: true;
      data: T;
      system: SystemStatus;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

export function useSheetsView<T>(view: SheetsView) {
  const [data, setData] = useState<T | null>(null);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/sheets?view=${view}`, { cache: "no-store" });
        const payload = (await response.json()) as ApiEnvelope<T>;

        if (!mounted) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setError("error" in payload ? payload.error : "Unable to load dashboard data.");
          setData(null);
          return;
        }

        setData(payload.data);
        setSystem(payload.system);
        setWarnings(payload.warnings ?? []);
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [view]);

  return { data, system, warnings, error, loading };
}
