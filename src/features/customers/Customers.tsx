import { useMemo } from "react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, ListHeader, type Column } from "@/components/DataTable";
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
  const configured = isApiConfigured();
  const { data, isLoading, isFetching } = useCustomers(page, LIMIT, debounced);
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
  ];

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
    </div>
  );
}
