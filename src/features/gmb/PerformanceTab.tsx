import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useGmbPerformance, PERFORMANCE_METRICS } from "./api";

const iso = (d: Date) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD local
const fieldCls = "h-[38px] rounded-md border border-border bg-surface px-3 text-sm text-ink-2 outline-none focus:border-brand";

export function PerformanceTab() {
  const [metric, setMetric] = useState(PERFORMANCE_METRICS[0].value);
  const def = useMemo(() => {
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate() - 30);
    return { start: iso(start), end: iso(end) };
  }, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);

  const { data, isLoading, isError } = useGmbPerformance(metric, start, end, true);
  const points = data ?? [];
  const totalVal = points.reduce((t, p) => t + (Number(p.value) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-3">Metric</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value)} className={`${fieldCls} pr-8`}>
            {PERFORMANCE_METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-3">From</span>
          <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-3">To</span>
          <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={fieldCls} />
        </label>
        <div className="ml-auto rounded-lg border border-border bg-surface px-4 py-2 text-right">
          <div className="text-xs text-ink-3">Total</div>
          <div className="text-lg font-bold tnum">{totalVal.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        {isLoading ? (
          <div className="grid h-[320px] place-items-center text-ink-3">Loading…</div>
        ) : isError ? (
          <div className="grid h-[320px] place-items-center text-danger">Couldn’t load performance data.</div>
        ) : points.length === 0 ? (
          <div className="grid h-[320px] place-items-center text-ink-3">No data for this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-3)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-3)" }} width={40} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} itemStyle={{ color: "var(--text)" }} />
              <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
