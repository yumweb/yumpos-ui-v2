import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Link2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/primitives";
import {
  useServices, useServiceBom, serviceName, serviceCategory, serviceCost, servicePrice,
  type ServiceItem,
} from "./api";
import { ServiceBomModal } from "./ServiceBomModal";

const LIMIT = 20;

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Per-row linked-products preview (cached BOM fetch). */
function BomCell({ itemId }: { itemId: number }) {
  const { data, isLoading } = useServiceBom(itemId);
  if (isLoading) return <span className="text-ink-3">…</span>;
  const comps = data ?? [];
  if (comps.length === 0) return <span className="text-ink-3">—</span>;
  const names = comps.map((c) => c.componentItem?.name).filter(Boolean) as string[];
  const firstTwo = names.slice(0, 2);
  const rest = names.length - firstTwo.length;
  return (
    <div className="leading-tight">
      {firstTwo.map((n, i) => <div key={i} className="text-[13px]">{n}</div>)}
      {rest > 0 && <div className="text-xs text-ink-3">+{rest} more</div>}
    </div>
  );
}

export function Services() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [bomService, setBomService] = useState<ServiceItem | null>(null);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useServices(page, LIMIT, debounced);
  const count = data?.count ?? 0;

  const columns: Column<ServiceItem>[] = [
    { header: "Name", cell: (s) => serviceName(s) },
    { header: "Category", cell: (s) => serviceCategory(s) },
    { header: "Cost price", align: "right", cell: (s) => <span className="tnum">{inr(serviceCost(s))}</span> },
    { header: "Selling price", align: "right", cell: (s) => <span className="tnum">{inr(servicePrice(s))}</span> },
    { header: "Linked products", cell: (s) => <BomCell itemId={s.itemId} /> },
    {
      header: "Action",
      cell: (s) => (
        <Button variant="default" onClick={() => setBomService(s)}>
          <Link2 className="h-4 w-4" /> Linked Products
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Services</h1>
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
          placeholder="Search services…"
          className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
      </label>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(s) => String(s.itemId)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No services found."
        countNoun="services"
      />

      <ServiceBomModal
        service={bomService}
        onClose={() => setBomService(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["service-bom"] })}
      />
    </div>
  );
}
