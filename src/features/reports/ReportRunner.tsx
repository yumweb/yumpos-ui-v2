import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { getLocation } from "@/lib/auth";
import { Button, Card } from "@/components/ui/primitives";
import { DataTable } from "@/components/DataTable";
import { findReport } from "./data";
import { getReportConfig } from "./configs";
import { ReportFilters } from "./ReportFilters";
import { defaultRange } from "./dates";
import { downloadCsv, objectsToCsv } from "./csv";
import type { ParamDef, ParamValues, ReportResult, SummaryTile } from "./types";

const PAGE_SIZE = 25;

function initValues(params: ParamDef[]): ParamValues {
  const v: ParamValues = {};
  for (const p of params) {
    if (p.default !== undefined) { v[p.key] = p.default; continue; }
    if (p.type === "dateRange") v[p.key] = defaultRange();
    else if (p.type === "date") v[p.key] = new Date().toISOString().slice(0, 10);
    else if (p.type === "monthYear") v[p.key] = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
    else if (p.type === "multiselect") v[p.key] = [];
    else if (p.type === "checkbox") v[p.key] = false;
    else if (p.type === "select" && p.includeAll) v[p.key] = p.allValue ?? 0;
    else v[p.key] = "";
  }
  return v;
}

function missingRequired(params: ParamDef[], values: ParamValues): string | null {
  for (const p of params) {
    if (!p.required) continue;
    const v = values[p.key];
    if (p.type === "dateRange") { const r = v as { from?: string; to?: string }; if (!r?.from || !r?.to) return `Select a ${p.label.toLowerCase()}.`; }
    else if (v === "" || v == null || (Array.isArray(v) && v.length === 0)) return `Select ${p.label.toLowerCase()}.`;
  }
  return null;
}

export function ReportRunner() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const card = findReport(slug);
  const config = getReportConfig(slug);

  const [values, setValues] = useState<ParamValues>(() => initValues(config?.params ?? []));
  const [applied, setApplied] = useState<ParamValues | null>(config?.autoRun ? initValues(config?.params ?? []) : null);
  const [page, setPage] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const locationId = Number(getLocation()?.locationId);

  const query = useQuery({
    queryKey: ["report", slug, applied],
    enabled: isApiConfigured() && !!config?.run && applied != null,
    queryFn: () => config!.run!(applied!, { locationId, page: 1, limit: 1000 }),
  });

  const result = query.data as ReportResult | undefined;
  const allRows = result?.rows ?? [];
  const maxPage = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r, i) => ({ ...(r as object), __rid: (page - 1) * PAGE_SIZE + i })) as Record<string, unknown>[],
    [allRows, page]
  );

  if (!card || !config) {
    return (
      <div className="flex flex-col gap-5">
        <BackLink onClick={() => navigate("/reports")} />
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Unknown report.</div>
      </div>
    );
  }

  function handleRun() {
    const err = missingRequired(config!.params, values);
    setValidationError(err);
    if (err) return;
    setApplied({ ...values });
    setPage(1);
  }
  function handleReset() {
    const init = initValues(config!.params);
    setValues(init); setApplied(config!.autoRun ? init : null); setValidationError(null); setPage(1);
  }
  const dirty = JSON.stringify(values) !== JSON.stringify(initValues(config.params));

  const Body = config.Body;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <BackLink onClick={() => navigate("/reports")} />
          <h1 className="mt-2 text-[25px] font-bold tracking-tight">{card.name}</h1>
          <p className="mt-0.5 text-sm text-ink-2">{card.desc}</p>
        </div>
      </div>

      <ReportFilters
        params={config.params}
        values={values}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onRun={handleRun}
        onReset={handleReset}
        running={query.isFetching}
        dirty={dirty}
      />

      {validationError && <div className="rounded-md bg-[var(--warn-soft)] px-3 py-2 text-sm font-medium text-warn">{validationError}</div>}

      {/* Custom-body reports render their own content */}
      {Body ? (
        <Body values={applied ?? values} />
      ) : applied == null ? (
        <PromptState hasParams={config.params.length > 0} />
      ) : (
        <DeclarativeResult
          result={result}
          loading={query.isLoading}
          isError={query.isError}
          rows={pageRows}
          totalRows={allRows.length}
          page={page}
          maxPage={maxPage}
          onPage={setPage}
          columns={config.columns ?? []}
          onExport={() => downloadCsv(`${slug}.csv`, objectsToCsv(allRows as Record<string, unknown>[]))}
        />
      )}
    </div>
  );
}

function DeclarativeResult({
  result, loading, isError, rows, totalRows, page, maxPage, onPage, columns, onExport,
}: {
  result?: ReportResult; loading: boolean; isError: boolean;
  rows: Record<string, unknown>[]; totalRows: number; page: number; maxPage: number; onPage: (p: number) => void;
  columns: import("@/components/DataTable").Column<Record<string, unknown>>[]; onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {result?.summary && result.summary.length > 0 && <SummaryStrip tiles={result.summary} />}
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-2">{loading ? "Loading…" : `${totalRows.toLocaleString("en-IN")} row${totalRows === 1 ? "" : "s"}`}</span>
        {totalRows > 0 && <Button variant="default" size="sm" onClick={onExport}><Download className="h-4 w-4" /> Export CSV</Button>}
      </div>
      <DataTable
        columns={columns} rows={rows} getRowId={(r) => String((r as { __rid: number }).__rid)}
        configured loading={loading} error={isError}
        page={page} maxPage={maxPage} count={totalRows} onPage={onPage}
        emptyText="No data for the selected filters." countNoun="rows"
      />
    </div>
  );
}

function SummaryStrip({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {tiles.map((t) => (
        <Card key={t.label} className="p-3">
          <div className={`text-lg font-bold tnum ${t.tone === "danger" ? "text-danger" : t.tone === "ok" ? "text-ok" : t.tone === "warn" ? "text-warn" : ""}`}>{t.value}</div>
          <div className="mt-0.5 text-xs text-ink-3">{t.label}</div>
        </Card>
      ))}
    </div>
  );
}

function PromptState({ hasParams }: { hasParams: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
      <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-ink-3" />
      <p className="text-sm font-medium text-ink-2">{hasParams ? "Choose your filters above and run the report." : "Run the report to view results."}</p>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-brand">
      <ArrowLeft className="h-4 w-4" /> All reports
    </button>
  );
}
