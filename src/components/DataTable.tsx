import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/primitives";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "right";
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  configured: boolean;
  loading: boolean;
  error?: boolean;
  page: number;
  maxPage: number;
  count: number;
  onPage: (p: number) => void;
  emptyText?: string;
  errorText?: string;
  countNoun?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  configured,
  loading,
  error = false,
  page,
  maxPage,
  count,
  onPage,
  emptyText = "No records found.",
  errorText = "Couldn’t load. Please try again.",
  countNoun = "records",
}: DataTableProps<T>) {
  const span = columns.length;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={cn("px-3 py-3 font-semibold", c.align === "right" && "text-right", i === 0 && "pl-5", i === span - 1 && "pr-5", c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!configured ? (
              <tr><td colSpan={span} className="px-5 py-12 text-center text-sm text-ink-3">Connect the API to load data.</td></tr>
            ) : loading ? (
              <tr><td colSpan={span} className="px-5 py-12 text-center text-sm text-ink-3">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={span} className="px-5 py-12 text-center text-sm font-medium text-danger">{errorText}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={span} className="px-5 py-12 text-center text-sm text-ink-3">{emptyText}</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={getRowId(row)} className="border-t border-border hover:bg-surface-2">
                  {columns.map((c, i) => (
                    <td
                      key={i}
                      className={cn("px-3 py-2.5", c.align === "right" && "text-right tnum", i === 0 && "pl-5 font-semibold", i === span - 1 && "pr-5")}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {configured && count > 0 && (
        <div className="flex items-center gap-2 border-t border-border px-5 py-3">
          <span className="flex-1 text-xs text-ink-3">
            Page {page} of {maxPage} · {count.toLocaleString("en-IN")} {countNoun}
          </span>
          <PagerBtn disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </PagerBtn>
          <PagerBtn disabled={page >= maxPage} onClick={() => onPage(Math.min(maxPage, page + 1))}>
            <ChevronRight className="h-4 w-4" />
          </PagerBtn>
        </div>
      )}
    </Card>
  );
}

function PagerBtn({ disabled, onClick, children }: { disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-ink-2",
        "disabled:opacity-40 enabled:hover:bg-surface-2"
      )}
    >
      {children}
    </button>
  );
}

/** Shared list-page header with title, count and a debounce-friendly search box. */
export function ListHeader({
  title,
  subtitle,
  search,
  onSearch,
  searching,
  placeholder = "Search…",
}: {
  title: string;
  subtitle: string;
  search: string;
  onSearch: (v: string) => void;
  searching?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h1 className="text-[25px] font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
      </div>
      <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <SearchIcon />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
        {searching && <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-3 border-t-transparent" />}
      </label>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
