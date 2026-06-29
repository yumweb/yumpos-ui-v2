import { useState } from "react";
import { isApiConfigured } from "@/lib/apiClient";
import { DataTable, type Column } from "@/components/DataTable";
import { useReviews, type Review } from "./api";

const LIMIT = 20;
const fmtDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export function Reviews() {
  const [page, setPage] = useState(1);
  const configured = isApiConfigured();
  const { data, isLoading } = useReviews(page, LIMIT);
  const count = data?.count ?? 0;

  const columns: Column<Review>[] = [
    { header: "Location", cell: (r) => r.location?.name || (r.locationId != null ? `#${r.locationId}` : "—") },
    { header: "Date", cell: (r) => fmtDate(r.createdDate) },
    { header: "Feedback", cell: (r) => <span className="block max-w-[460px] whitespace-pre-wrap text-ink-2">{r.review?.trim() || "—"}</span> },
    { header: "Customer", cell: (r) => <span className="font-semibold">{r.customerName || "—"}</span> },
    { header: "Phone", cell: (r) => <span className="tnum">{r.phone || "—"}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Reviews</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
      </div>
      <p className="-mt-2 text-sm text-ink-2">Customer feedback collected from your stores.</p>

      <DataTable
        columns={columns}
        rows={data?.reviews ?? []}
        getRowId={(r) => String(r.id)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No reviews yet."
        countNoun="reviews"
      />
    </div>
  );
}
