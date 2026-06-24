import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { isApiConfigured } from "@/lib/apiClient";
import { Card } from "@/components/ui/primitives";
import { useCustomers, type Customer } from "./api";

const LIMIT = 20;

function fullName(c: Customer) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
}
function fmtDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function Customers() {
  const [name, setName] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const configured = isApiConfigured();

  // debounce search; reset to page 1 on new query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(name);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [name]);

  const { data, isLoading, isFetching } = useCustomers(page, LIMIT, debounced);
  const rows = data?.customers ?? [];
  const count = data?.count ?? 0;
  const maxPage = Math.max(1, Math.ceil(count / LIMIT));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-ink-2">
            {configured ? `${count.toLocaleString("en-IN")} total` : "Live data not connected"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Search name…"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="py-3 font-semibold">Phone</th>
              <th className="py-3 font-semibold">Loyalty card</th>
              <th className="py-3 font-semibold">Source</th>
              <th className="py-3 font-semibold">Gender</th>
              <th className="py-3 text-right font-semibold">Points</th>
              <th className="py-3 font-semibold">Created</th>
              <th className="px-5 py-3 font-semibold">Last sale</th>
            </tr>
          </thead>
          <tbody>
            {!configured ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-ink-3">Connect the API to load customers.</td></tr>
            ) : isLoading ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-ink-3">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-ink-3">No customers found.</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={String(c.id)} className="border-t border-border hover:bg-surface-2">
                  <td className="px-5 py-2.5 font-semibold">{fullName(c)}</td>
                  <td className="py-2.5 tnum">{c.phone_number ?? "—"}</td>
                  <td className="py-2.5">{c.loyalty_card_number ?? "—"}</td>
                  <td className="py-2.5">{c.source ?? "—"}</td>
                  <td className="py-2.5">{c.gender ?? "—"}</td>
                  <td className="py-2.5 text-right tnum">{c.points ?? 0}</td>
                  <td className="py-2.5">{fmtDate(c.created_at)}</td>
                  <td className="px-5 py-2.5">{fmtDate(c.last_sale)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {configured && count > 0 && (
          <div className="flex items-center gap-2 border-t border-border px-5 py-3">
            <span className="flex-1 text-xs text-ink-3">
              Page {page} of {maxPage} · {count.toLocaleString("en-IN")} customers
            </span>
            <PagerBtn disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </PagerBtn>
            <PagerBtn disabled={page >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </PagerBtn>
          </div>
        )}
      </Card>
    </div>
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
