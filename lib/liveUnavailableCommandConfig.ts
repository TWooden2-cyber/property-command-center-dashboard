import type { CommandPageConfig } from "@/types/commandPage";

export function createLiveUnavailableCommandConfig(id: string, title: string, subtitle: string): CommandPageConfig {
  return {
    id,
    title,
    subtitle,
    localNotice: "Production requires live Google Sheets or an approved live Google API.",
    healthStatus: "Live data not connected",
    healthDetail: "This tab will not display sample, mock, demo, fallback, hardcoded, or local static records in production.",
    kpis: [],
    tableColumns: [],
    tableRows: [],
    queues: [],
    blocked: [],
    approvalGate: [],
    filters: [],
    safetyFooter: "No production data is shown until a verified live source is connected."
  };
}
