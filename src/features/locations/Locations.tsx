import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { useAllLocations, type Location } from "./api";
import { LocationModal } from "./LocationModal";

const LIMIT = 20;

export function Locations() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [editId, setEditId] = useState<number | null>(null);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data: all, isLoading, isFetching } = useAllLocations();
  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const list = all ?? [];
    if (!q) return list;
    return list.filter((l) =>
      [l.name, l.address, l.phone, l.email, l.storeCode].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [all, debounced]);

  const count = filtered.length;
  const maxPage = Math.max(1, Math.ceil(count / LIMIT));
  const rows = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const columns: Column<Location>[] = [
    { header: "ID", cell: (l) => <span className="tnum text-ink-3">#{l.locationId}</span> },
    { header: "Name", cell: (l) => <span className="font-semibold">{l.name || "—"}</span> },
    { header: "Address", cell: (l) => l.address || "—" },
    { header: "Phone", cell: (l) => <span className="tnum">{l.phone || "—"}</span> },
    { header: "Email", cell: (l) => l.email || "—" },
    {
      header: "Action",
      cell: (l) => (
        <button onClick={() => setEditId(l.locationId)} className="font-semibold text-brand hover:underline">Edit</button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Locations</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
      </div>
      <p className="-mt-2 text-sm text-ink-2">Edit a store's settings: contact details, timezone and tax configuration.</p>

      <label className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <Search className="h-4 w-4 text-ink-3" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, address, store code…"
          className="w-64 bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
      </label>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(l) => String(l.locationId)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={maxPage}
        count={count}
        onPage={setPage}
        emptyText="No locations found."
        countNoun="locations"
      />

      <LocationModal
        editId={editId}
        onClose={() => setEditId(null)}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["all-locations"] }); qc.invalidateQueries({ queryKey: ["location-detail"] }); }}
      />
    </div>
  );
}
