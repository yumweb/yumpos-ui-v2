import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/primitives";
import { useGiftCards, gcCustomerName, type GiftCard } from "./api";
import { GiftCardModal } from "./GiftCardModal";

const LIMIT = 20;

const inr = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
};

export function GiftCards() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [editCard, setEditCard] = useState<GiftCard | null>(null);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useGiftCards(page, LIMIT, debounced);
  const count = data?.count ?? 0;

  const columns: Column<GiftCard>[] = [
    { header: "Gift card #", cell: (c) => <span className="tnum">{c.giftcardNumber}</span> },
    { header: "Value", align: "right", cell: (c) => <span className="tnum">{inr(c.value)}</span> },
    { header: "Description", cell: (c) => c.description?.trim() || "—" },
    { header: "Customer", cell: (c) => gcCustomerName(c) },
    {
      header: "Status",
      cell: (c) => (c.inactive ? <Badge tone="default">Inactive</Badge> : <Badge tone="ok">Active</Badge>),
    },
    {
      header: "Action",
      cell: (c) => (
        <button onClick={() => setEditCard(c)} className="font-semibold text-brand hover:underline">Edit</button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Gift Cards</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      <label className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <Search className="h-4 w-4 text-ink-3" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search card number…"
          className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
      </label>

      <DataTable
        columns={columns}
        rows={data?.giftcards ?? []}
        getRowId={(c) => String(c.id)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No gift cards found."
        countNoun="gift cards"
      />

      <GiftCardModal
        card={editCard}
        onClose={() => setEditCard(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["gift-cards"] })}
      />
    </div>
  );
}
