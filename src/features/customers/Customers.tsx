import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Loader2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/primitives";
import { NewCustomerModal } from "@/features/sales/NewCustomerModal";
import { useCustomers, useLeadSources, type Customer } from "./api";

const LIMIT = 20;

const fullName = (c: Customer) =>
  [c.person?.firstName, c.person?.lastName].filter(Boolean).join(" ") || "—";

const genderLabel = (g: Customer["gender"]) => {
  const s = String(g ?? "");
  if (s === "0" || /^male$/i.test(s)) return "Male";
  if (s === "1" || /^female$/i.test(s)) return "Female";
  return s ? s : "—";
};

const fmtDate = (d?: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export function Customers() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [source, setSource] = useState("");
  const [gender, setGender] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useCustomers(page, LIMIT, debounced, source, gender);
  const { data: sources } = useLeadSources();

  const sourceMap = useMemo(() => {
    const m = new Map<string, string>();
    (sources ?? []).forEach((s) => m.set(String(s.id), s.source));
    return m;
  }, [sources]);

  const count = data?.count ?? 0;

  const columns: Column<Customer>[] = [
    { header: "Name", cell: fullName },
    { header: "Phone", cell: (c) => <span className="tnum">{c.person?.phoneNumber ?? "—"}</span> },
    { header: "Loyalty card", cell: (c) => c.loyaltyCardNumber || "NA" },
    { header: "Source", cell: (c) => (c.sourceId != null ? sourceMap.get(String(c.sourceId)) ?? "—" : "—") },
    { header: "Gender", cell: (c) => genderLabel(c.gender) },
    { header: "Points", align: "right", cell: (c) => Number(c.points ?? 0) },
    { header: "Created", cell: (c) => fmtDate(c.createdDate) },
    { header: "Last Sale", cell: () => <span className="font-semibold text-brand/80">View Sales</span> },
    {
      header: "Action",
      cell: (c) => (
        <button onClick={() => setEditCustomer(c)} className="font-semibold text-brand hover:underline">Edit</button>
      ),
    },
  ];

  const selectCls = "h-[38px] rounded-full border border-border bg-surface px-3.5 text-sm text-ink-2 outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Customers</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> New Customer
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone…"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
        </label>

        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">Lead Source</option>
          {(sources ?? []).map((s) => (
            <option key={String(s.id)} value={String(s.id)}>{s.source}</option>
          ))}
        </select>

        <select value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">Gender</option>
          <option value="0">Male</option>
          <option value="1">Female</option>
          <option value="2">Other</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.customers ?? []}
        getRowId={(c) => String(c.personId ?? c.id ?? c.loyaltyCardNumber ?? c.person?.phoneNumber)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No customers found."
        countNoun="customers"
      />

      <NewCustomerModal
        open={newOpen || !!editCustomer}
        editCustomer={editCustomer}
        onClose={() => { setNewOpen(false); setEditCustomer(null); }}
        onCreated={() => qc.invalidateQueries({ queryKey: ["customers"] })}
      />
    </div>
  );
}
