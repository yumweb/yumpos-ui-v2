import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, ListHeader, type Column } from "@/components/DataTable";
import { useCustomers, type Customer } from "./api";

const LIMIT = 20;

const fullName = (c: Customer) => [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
const fmtDate = (d?: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const columns: Column<Customer>[] = [
  { header: "Name", cell: fullName },
  { header: "Phone", cell: (c) => <span className="tnum">{c.phone_number ?? "—"}</span> },
  { header: "Loyalty card", cell: (c) => c.loyalty_card_number ?? "—" },
  { header: "Source", cell: (c) => c.source ?? "—" },
  { header: "Gender", cell: (c) => c.gender ?? "—" },
  { header: "Points", align: "right", cell: (c) => c.points ?? 0 },
  { header: "Created", cell: (c) => fmtDate(c.created_at) },
  { header: "Last sale", cell: (c) => fmtDate(c.last_sale) },
];

export function Customers() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const configured = isApiConfigured();
  const { data, isLoading, isFetching } = useCustomers(page, LIMIT, debounced);

  const count = data?.count ?? 0;
  return (
    <div className="flex flex-col gap-5">
      <ListHeader
        title="Customers"
        subtitle={configured ? `${count.toLocaleString("en-IN")} total` : "Live data not connected"}
        search={search}
        onSearch={setSearch}
        searching={isFetching}
        placeholder="Search name…"
      />
      <DataTable
        columns={columns}
        rows={data?.customers ?? []}
        getRowId={(c) => String(c.id)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No customers found."
        countNoun="customers"
      />
    </div>
  );
}
