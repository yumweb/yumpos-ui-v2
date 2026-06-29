import { cn } from "@/lib/cn";

export interface Stat { label: string; value: string; tone?: "default" | "ok" | "warn" | "danger" }

/** Compact, space-efficient row of label/value stats shown above report tables. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-[110px] flex-1 items-baseline justify-between gap-2 rounded-md border border-border bg-surface px-3 py-1.5">
          <span className="text-[11px] text-ink-3">{s.label}</span>
          <span className={cn("text-sm font-bold tnum",
            s.tone === "danger" && "text-danger", s.tone === "ok" && "text-ok", s.tone === "warn" && "text-warn")}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}
