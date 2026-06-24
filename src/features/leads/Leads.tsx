import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, ListHeader, type Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/primitives";
import { useLeads, pick, type Lead } from "./api";

const LIMIT = 20;

const fmtDate = (raw: string) => {
  if (!raw) return "—";
  const dt = new Date(raw);
  return isNaN(dt.getTime()) ? raw : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const name = (l: Lead) =>
  pick(l, "fullName", "full_name", "customer_name", "name") ||
  [pick(l, "first_name"), pick(l, "last_name")].filter(Boolean).join(" ") || "—";

const columns: Column<Lead>[] = [
  { header: "Created", cell: (l) => fmtDate(pick(l, "dateCreated", "created_at", "createdAt")) },
  { header: "Customer name", cell: name },
  { header: "Status", cell: (l) => { const s = pick(l, "status", "lead_status"); return s ? <Badge tone="brand">{s}</Badge> : "—"; } },
  { header: "Next follow-up", cell: (l) => fmtDate(pick(l, "followupDate", "follow_up_date", "next_followup", "nextFollowUp")) },
  { header: "Source", cell: (l) => pick(l, "source", "lead_source") || "—" },
  { header: "First bill", align: "right", cell: (l) => pick(l, "firstBillValue", "first_bill_value") || "—" },
];

export function Leads() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const configured = isApiConfigured();
  const { data, isLoading, isFetching } = useLeads(page, LIMIT, debounced);
  const count = data?.count ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <ListHeader
        title="Leads"
        subtitle={configured ? `${count.toLocaleString("en-IN")} total` : "Live data not connected"}
        search={search}
        onSearch={setSearch}
        searching={isFetching}
        placeholder="Search name…"
      />
      <DataTable
        columns={columns}
        rows={data?.leads ?? []}
        getRowId={(l) => String(l.id)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No leads found."
        countNoun="leads"
      />
    </div>
  );
}
