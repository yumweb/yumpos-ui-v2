import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Plus } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/primitives";
import { useItemKits, kitName, kitCost, kitPrice, type ItemKitRow } from "./api";
import { ItemKitModal } from "./ItemKitModal";

const LIMIT = 20;
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function ItemKits() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [editId, setEditId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useItemKits(page, LIMIT, debounced);
  const count = data?.count ?? 0;

  const close = () => { setEditId(null); setCreating(false); };
  const refresh = () => qc.invalidateQueries({ queryKey: ["item-kits"] });

  const columns: Column<ItemKitRow>[] = [
    { header: "Item kit", cell: (k) => <span className="font-semibold">{kitName(k)}</span> },
    { header: "Cost price", align: "right", cell: (k) => <span className="tnum">{inr(kitCost(k))}</span> },
    { header: "Selling price", align: "right", cell: (k) => <span className="tnum">{inr(kitPrice(k))}</span> },
    {
      header: "Action",
      cell: (k) => (
        <button onClick={() => setEditId(k.itemKitId)} className="font-semibold text-brand hover:underline">Edit</button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Item Kits</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New Item Kit
        </Button>
      </div>

      <label className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <Search className="h-4 w-4 text-ink-3" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search item kits…"
          className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
      </label>

      <DataTable
        columns={columns}
        rows={data?.itemkits ?? []}
        getRowId={(k) => String(k.itemKitId)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No item kits found."
        countNoun="item kits"
      />

      <ItemKitModal
        open={creating || editId != null}
        editId={editId}
        onClose={close}
        onSaved={refresh}
      />
    </div>
  );
}
