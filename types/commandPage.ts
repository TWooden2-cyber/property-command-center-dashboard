import type { SignalTone } from "@/lib/propertyCommandCenterData";

export type CommandTableRow = {
  id: string;
  values: Record<string, string>;
  tone?: SignalTone;
};

export type CommandTableColumn = {
  key: string;
  header: string;
};

export type CommandPageConfig = {
  id: string;
  title: string;
  subtitle: string;
  localNotice: string;
  healthStatus: string;
  healthDetail: string;
  kpis: Array<{ label: string; value: string; helper: string; tone: SignalTone }>;
  tableColumns: CommandTableColumn[];
  tableRows: CommandTableRow[];
  queues: Array<{ title: string; detail: string; items: string[]; tone: SignalTone }>;
  blocked: string[];
  approvalGate: string[];
  filters: string[];
  safetyFooter: string;
  relatedLinks?: Array<{ title: string; detail: string; href: string; action: string; tone: SignalTone }>;
};
