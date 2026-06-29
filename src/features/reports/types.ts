import type { Column } from "@/components/DataTable";

/** A single report parameter the user sets before running the report. */
export type ParamType = "dateRange" | "date" | "monthYear" | "select" | "multiselect" | "checkbox" | "number";

export interface ParamOption { value: string | number; label: string }
/** Dynamic option sources resolved at render time from existing app APIs. */
export type OptionSource = "employees" | "suppliers" | "categories" | "items";

export interface ParamDef {
  key: string;
  label: string;
  type: ParamType;
  options?: ParamOption[];
  source?: OptionSource;
  required?: boolean;
  /** Prepend an "All" option to a select (value = allValue, default 0). */
  includeAll?: boolean;
  allValue?: string | number;
  allLabel?: string;
  default?: unknown;
  help?: string;
}

/** Resolved parameter values keyed by ParamDef.key. */
export type ParamValues = Record<string, unknown>;

export interface DateRange { from: string; to: string }
export interface MonthYear { month: number; year: number }

/** A summary tile shown above the result table (totals strip). */
export interface SummaryTile { label: string; value: string; tone?: "default" | "ok" | "warn" | "danger" }

export interface ReportResult<T = Record<string, unknown>> {
  rows: T[];
  total?: number;
  summary?: SummaryTile[];
}

export interface RunContext {
  locationId: number;
  page: number;
  limit: number;
}

export interface ReportConfig<T = Record<string, unknown>> {
  slug: string;
  params: ParamDef[];
  /** Declarative table reports: fetch + normalize into rows/summary. */
  run?: (values: ParamValues, ctx: RunContext) => Promise<ReportResult<T>>;
  columns?: Column<T>[];
  paginated?: boolean;
  /** CSV export — return rows as a 2D array (first row = headers). */
  csv?: (values: ParamValues, ctx: RunContext) => Promise<string[][]>;
  /** Fully custom body (forms, charts, editable grids) rendered below the filters. */
  Body?: React.ComponentType<{ values: ParamValues }>;
  /** Reports whose body shows immediately without a Run step (e.g. today's events). */
  autoRun?: boolean;
}
