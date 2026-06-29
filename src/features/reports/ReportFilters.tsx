import { cn } from "@/lib/cn";
import { Play, RotateCcw, Loader2 } from "lucide-react";
import { Card, Button } from "@/components/ui/primitives";
import { MultiSelect } from "@/components/MultiSelect";
import { fieldCls } from "@/components/Modal";
import { useOptionSource } from "./useReportOptions";
import { DATE_PRESETS, MONTHS, yearOptions } from "./dates";
import type { ParamDef, ParamValues, DateRange, MonthYear, ParamOption } from "./types";

export function ReportFilters({
  params, values, onChange, onRun, onReset, running, dirty,
}: {
  params: ParamDef[];
  values: ParamValues;
  onChange: (key: string, value: unknown) => void;
  onRun: () => void;
  onReset: () => void;
  running: boolean;
  dirty: boolean;
}) {
  if (params.length === 0) return null;
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        {params.map((p) => (
          <div key={p.key}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-3">{p.label}</label>
            <Control p={p} value={values[p.key]} onChange={(v) => onChange(p.key, v)} />
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {dirty && <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw className="h-4 w-4" /> Reset</Button>}
          <Button variant="primary" size="sm" onClick={onRun} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run report
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Control({ p, value, onChange }: { p: ParamDef; value: unknown; onChange: (v: unknown) => void }) {
  switch (p.type) {
    case "dateRange": return <DateRangeControl value={value as DateRange} onChange={onChange} />;
    case "date": return <input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={`${fieldCls} max-w-[180px]`} />;
    case "monthYear": return <MonthYearControl value={value as MonthYear} onChange={onChange} />;
    case "checkbox":
      return (
        <label className="flex h-[38px] items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {p.help ? "" : "Yes"}
        </label>
      );
    case "number": return <input type="number" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={`${fieldCls} max-w-[160px]`} />;
    case "multiselect": return <SourceMulti p={p} value={(value as Array<string | number>) ?? []} onChange={onChange} />;
    case "select": return <SourceSelect p={p} value={value} onChange={onChange} />;
    default: return null;
  }
}

function DateRangeControl({ value, onChange }: { value?: DateRange; onChange: (v: DateRange) => void }) {
  const v = value ?? { from: "", to: "" };
  const activePreset = DATE_PRESETS.find((p) => { const r = p.range(); return r.from === v.from && r.to === v.to; });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {DATE_PRESETS.map((p) => (
        <button key={p.key} type="button" onClick={() => onChange(p.range())}
          className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", activePreset?.key === p.key ? "border-brand bg-brand-100 text-brand" : "border-border text-ink-2 hover:bg-surface-2")}>
          {p.label}
        </button>
      ))}
      <input type="date" value={v.from} onChange={(e) => onChange({ ...v, from: e.target.value })} className={`${fieldCls} h-9 max-w-[150px]`} />
      <span className="text-sm text-ink-3">to</span>
      <input type="date" value={v.to} onChange={(e) => onChange({ ...v, to: e.target.value })} className={`${fieldCls} h-9 max-w-[150px]`} />
    </div>
  );
}

function MonthYearControl({ value, onChange }: { value?: MonthYear; onChange: (v: MonthYear) => void }) {
  const v = value ?? { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  return (
    <div className="flex gap-2">
      <select value={v.month} onChange={(e) => onChange({ ...v, month: Number(e.target.value) })} className={`${fieldCls} max-w-[150px]`}>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select value={v.year} onChange={(e) => onChange({ ...v, year: Number(e.target.value) })} className={`${fieldCls} max-w-[110px]`}>
        {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

function useResolvedOptions(p: ParamDef): { options: ParamOption[]; loading: boolean } {
  const dyn = useOptionSource(p.source);
  if (p.source) {
    const opts = p.includeAll ? [{ value: p.allValue ?? 0, label: p.allLabel ?? "All" }, ...dyn.options] : dyn.options;
    return { options: opts, loading: dyn.loading };
  }
  const opts = p.includeAll ? [{ value: p.allValue ?? 0, label: p.allLabel ?? "All" }, ...(p.options ?? [])] : (p.options ?? []);
  return { options: opts, loading: false };
}

function SourceSelect({ p, value, onChange }: { p: ParamDef; value: unknown; onChange: (v: unknown) => void }) {
  const { options, loading } = useResolvedOptions(p);
  return (
    <select value={value as string | number ?? ""} onChange={(e) => { const raw = e.target.value; onChange(/^\d+$/.test(raw) ? Number(raw) : raw); }} className={`${fieldCls} max-w-[240px]`} disabled={loading}>
      {loading && <option>Loading…</option>}
      {!loading && options.length === 0 && <option value="">No options</option>}
      {!loading && options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SourceMulti({ p, value, onChange }: { p: ParamDef; value: Array<string | number>; onChange: (v: Array<string | number>) => void }) {
  const { options } = useResolvedOptions(p);
  return (
    <MultiSelect
      label={value.length ? `${value.length} selected` : `All ${p.label.toLowerCase()}`}
      options={options.map((o) => ({ value: String(o.value), label: o.label }))}
      selected={value.map(String)}
      onChange={(next) => onChange(next.map((s) => (/^\d+$/.test(s) ? Number(s) : s)))}
    />
  );
}
