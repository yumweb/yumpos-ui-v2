import { useMemo, useState } from "react";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import {
  useRetailProducts, useCategoryTree, flattenCategories,
  retailName, retailCategory, retailCost, retailPrice, type RetailItem,
} from "./api";

const LIMIT = 20;
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function RetailProducts() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [category, setCategory] = useState("");
  const configured = isApiConfigured();

  const { data, isLoading, isFetching } = useRetailProducts(page, LIMIT, debounced, category);
  const { data: tree } = useCategoryTree();
  const count = data?.count ?? 0;

  const flatCats = useMemo(() => flattenCategories(tree ?? []), [tree]);

  const columns: Column<RetailItem>[] = [
    { header: "Name", cell: (r) => retailName(r) },
    { header: "Category", cell: (r) => retailCategory(r) },
    { header: "Cost price", align: "right", cell: (r) => <span className="tnum">{inr(retailCost(r))}</span> },
    { header: "Selling price", align: "right", cell: (r) => <span className="tnum">{inr(retailPrice(r))}</span> },
    { header: "Quantity", align: "right", cell: (r) => <span className="tnum">{r.quantity ?? 0}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Retail Products</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products…"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
        </label>

        <div className="relative">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="h-[38px] appearance-none rounded-full border border-border bg-surface pl-3.5 pr-9 text-sm text-ink-2 outline-none focus:border-brand"
          >
            <option value="">All categories</option>
            {flatCats.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(r) => String(r.itemId)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No retail products found."
        countNoun="products"
      />
    </div>
  );
}
