import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Plus } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/primitives";
import { useAllSuppliers, matchesSupplier, supplierName, type Supplier } from "./api";
import { NewSupplierModal } from "./NewSupplierModal";

const LIMIT = 20;

export function Suppliers() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [newOpen, setNewOpen] = useState(false);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data: all, isLoading, isFetching } = useAllSuppliers();
  const filtered = useMemo(
    () => (all?.data ?? []).filter((s) => matchesSupplier(s, debounced)),
    [all, debounced]
  );
  const count = filtered.length;
  const maxPage = Math.max(1, Math.ceil(count / LIMIT));
  const rows = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const columns: Column<Supplier>[] = [
    { header: "ID", cell: (s) => <span className="tnum text-ink-3">#{s.id}</span> },
    { header: "Company", cell: (s) => <span className="font-semibold">{s.companyName || "—"}</span> },
    { header: "Contact", cell: (s) => supplierName(s) },
    { header: "Email", cell: (s) => s.person?.email || "—" },
    { header: "Phone", cell: (s) => <span className="tnum">{s.person?.phoneNumber || "—"}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Suppliers</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> New Supplier
        </Button>
      </div>

      <label className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <Search className="h-4 w-4 text-ink-3" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search supplier name…"
          className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
      </label>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(s) => String(s.id)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={maxPage}
        count={count}
        onPage={setPage}
        emptyText="No suppliers found."
        countNoun="suppliers"
      />

      <NewSupplierModal open={newOpen} onClose={() => setNewOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["suppliers"] })} />
    </div>
  );
}
