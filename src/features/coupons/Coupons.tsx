import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Plus, Download, Eye } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { Button, Badge } from "@/components/ui/primitives";
import {
  useCoupons, fetchAllCoupons, couponValueLabel, couponDiscountType, couponStatus,
  couponCustomerName, COUPON_TYPE_LABEL, type Coupon,
} from "./api";
import { NewCouponModal } from "./NewCouponModal";
import { ViewCouponModal } from "./ViewCouponModal";

const LIMIT = 20;

const fmtDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function Coupons() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [newOpen, setNewOpen] = useState(false);
  const [viewCoupon, setViewCoupon] = useState<Coupon | null>(null);
  const [downloading, setDownloading] = useState(false);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useCoupons(page, LIMIT, debounced);
  const count = data?.count ?? 0;

  async function downloadCsv() {
    setDownloading(true);
    try {
      const all = await fetchAllCoupons();
      const rows = all.coupons ?? [];
      if (rows.length === 0) return;
      const headers = ["Coupon Number", "Value", "Discount Type", "Coupon Type", "Customer Number", "Customer Name", "Created Date", "Status"];
      const lines = rows.map((c) => [
        c.couponNumber,
        couponValueLabel(c),
        couponDiscountType(c),
        COUPON_TYPE_LABEL[c.couponType ?? ""] ?? "Manual",
        c.person?.phoneNumber ?? "",
        couponCustomerName(c) === "—" ? "" : couponCustomerName(c),
        fmtDate(c.startDate),
        couponStatus(c).label,
      ].map(csvCell).join(","));
      const csv = [headers.map(csvCell).join(","), ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coupons_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const columns: Column<Coupon>[] = [
    { header: "Coupon #", cell: (c) => <span className="tnum">{c.couponNumber}</span> },
    { header: "Value", align: "right", cell: (c) => <span className="tnum">{couponValueLabel(c)}</span> },
    { header: "Discount type", cell: (c) => couponDiscountType(c) },
    { header: "Coupon type", cell: (c) => COUPON_TYPE_LABEL[c.couponType ?? ""] ?? "Manual" },
    { header: "Customer", cell: (c) => couponCustomerName(c) },
    { header: "Created", cell: (c) => fmtDate(c.startDate) },
    { header: "Status", cell: (c) => { const s = couponStatus(c); return <Badge tone={s.tone}>{s.label}</Badge>; } },
    {
      header: "Action",
      cell: (c) => (
        <button aria-label="View coupon" title="View" onClick={() => setViewCoupon(c)}
          className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-ink-2 hover:bg-surface-2 hover:text-brand">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Coupons</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
        <div className="flex-1" />
        <Button variant="default" onClick={downloadCsv} disabled={downloading || !configured}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Coupons
        </Button>
        <Button variant="primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> New Coupon
        </Button>
      </div>

      <label className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <Search className="h-4 w-4 text-ink-3" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search coupon number…"
          className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
      </label>

      <DataTable
        columns={columns}
        rows={data?.coupons ?? []}
        getRowId={(c) => String(c.id)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No coupons found."
        countNoun="coupons"
      />

      <NewCouponModal open={newOpen} onClose={() => setNewOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["coupons"] })} />
      <ViewCouponModal coupon={viewCoupon} onClose={() => setViewCoupon(null)} />
    </div>
  );
}
