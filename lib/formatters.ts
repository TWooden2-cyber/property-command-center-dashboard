export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return Number.NaN;
  }

  const currencyPattern = raw.includes("$") ? /-?\$\s*\(?\d[\d,]*(?:\.\d+)?\)?/g : /-?\(?\d[\d,]*(?:\.\d+)?\)?/g;
  const currencyMatches = raw.match(currencyPattern);
  if (currencyMatches?.length) {
    const parsedValues = currencyMatches
      .map((match) => {
        const negative = /\(.*\)/.test(match) || match.trim().startsWith("-");
        const cleanedMatch = match.replace(/[$,\s()]/g, "").replace(/^-/, "");
        const parsed = Number(cleanedMatch);
        return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : Number.NaN;
      })
      .filter(Number.isFinite);

    if (parsedValues.length > 1 && raw.includes("$")) {
      return parsedValues.reduce((sum, item) => sum + item, 0);
    }

    if (parsedValues.length === 1) {
      return parsedValues[0];
    }
  }

  const cleaned = raw
    .replace(/\((.*)\)/, "-$1")
    .replace(/[$,%\s,]/g, "")
    .trim();

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return "Live value unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(value: string): string {
  const parsed = parseLooseDate(value);
  if (!parsed) {
    return value || "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

export function parseLooseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return startOfDay(value);
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return startOfDay(parsed);
  }

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) {
    return null;
  }

  const month = Number(match[1]) - 1;
  const day = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, month, day);

  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

export function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayDiff(from: Date, to: Date): number {
  const milliseconds = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(milliseconds / 86400000);
}

export function includesAny(value: unknown, needles: string[]): boolean {
  const haystack = String(value ?? "").toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
