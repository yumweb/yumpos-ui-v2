import type { DateRange } from "./types";

/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
export const ymd = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const startOfWeek = (d: Date) => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }; // Monday

export interface DatePreset { key: string; label: string; range: () => DateRange }

export const DATE_PRESETS: DatePreset[] = [
  { key: "today", label: "Today", range: () => { const t = new Date(); return { from: ymd(t), to: ymd(t) }; } },
  { key: "yesterday", label: "Yesterday", range: () => { const t = new Date(); t.setDate(t.getDate() - 1); return { from: ymd(t), to: ymd(t) }; } },
  { key: "last7", label: "Last 7 days", range: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 6); return { from: ymd(from), to: ymd(to) }; } },
  { key: "thisWeek", label: "This week", range: () => { const to = new Date(); return { from: ymd(startOfWeek(to)), to: ymd(to) }; } },
  { key: "thisMonth", label: "This month", range: () => { const t = new Date(); return { from: ymd(new Date(t.getFullYear(), t.getMonth(), 1)), to: ymd(t) }; } },
  { key: "lastMonth", label: "Last month", range: () => { const t = new Date(); const from = new Date(t.getFullYear(), t.getMonth() - 1, 1); const to = new Date(t.getFullYear(), t.getMonth(), 0); return { from: ymd(from), to: ymd(to) }; } },
  { key: "thisYear", label: "This year", range: () => { const t = new Date(); return { from: ymd(new Date(t.getFullYear(), 0, 1)), to: ymd(t) }; } },
];

export const defaultRange = (): DateRange => DATE_PRESETS.find((p) => p.key === "thisMonth")!.range();

/** Backend date-time bounds for an inclusive YYYY-MM-DD range. */
export const startOfDay = (d: string) => `${d} 00:00:00`;
export const endOfDay = (d: string) => `${d} 23:59:59`;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const yearOptions = (back = 6) => {
  const now = new Date().getFullYear();
  return Array.from({ length: back }, (_, i) => now - i);
};

export const fmtDateTime = (d?: string) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
export const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
export const fmtMoney = (n?: number | string) => {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return v == null || isNaN(v) ? "-" : `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
