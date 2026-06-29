import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { isApiConfigured } from "@/lib/apiClient";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/DataTable";
import { getBounceBackSummary, getBounceBackIssuance, getBounceBackRedemption, type BounceBackRow } from "../api";
import { fmtMoney, fmtDateTime, fmtDate } from "../dates";
import { StatStrip } from "../StatStrip";
import type { ParamValues, DateRange } from "../types";

const LIMIT = 20;
const statusTone = (s?: string): BadgeTone => s === "redeemed" ? "ok" : s === "pending" ? "warn" : s === "expired" ? "danger" : "default";

export function BounceBackBody({ values }: { values: ParamValues }) {
  const range = values.range as DateRange;
  const enabled = isApiConfigured() && !!range?.from && !!range?.to;
  const [view, setView] = useState<"issuance" | "redemption">("issuance");
  const [page, setPage] = useState(1);

  const summary = useQuery({ queryKey: ["bb-summary"], enabled: isApiConfigured(), queryFn: getBounceBackSummary });
  const issuance = useQuery({ queryKey: ["bb-issuance", range, page], enabled: enabled && view === "issuance", placeholderData: keepPreviousData, queryFn: () => getBounceBackIssuance(range.from, range.to, page, LIMIT) });
  const redemption = useQuery({ queryKey: ["bb-redemption", range], enabled: enabled && view === "redemption", queryFn: () => getBounceBackRedemption(range.from, range.to) });

  const s = summary.data;
  const baseCols: Column<BounceBackRow>[] = [
    { header: "Coupon", cell: (r) => <span className="font-mono text-xs">{r.couponNumber}</span> },
    { header: "Customer", cell: (r) => r.customerName || "-" },
    { header: "Phone", cell: (r) => <span className="font-mono text-xs">{r.customerPhone}</span> },
    { header: "Issued", cell: (r) => fmtDateTime(r.createdAt) },
    { header: "Valid till", cell: (r) => fmtDate(r.validityDate) },
    { header: "Value", cell: (r) => fmtMoney(r.value), align: "right" },
    { header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
  ];
  const redemptionCols: Column<BounceBackRow>[] = [
    ...baseCols,
    { header: "Redeemed", cell: (r) => fmtDateTime(r.redeemedAt ?? undefined) },
    { header: "Days to redeem", cell: (r) => r.daysToRedemption ?? "-", align: "right" },
  ];

  const isIssuance = view === "issuance";
  const rows = isIssuance ? (issuance.data?.data ?? []) : (redemption.data ?? []);
  const total = isIssuance ? (issuance.data?.total ?? 0) : (redemption.data?.length ?? 0);
  const loading = isIssuance ? issuance.isLoading : redemption.isLoading;
  const isError = isIssuance ? issuance.isError : redemption.isError;

  return (
    <div className="flex flex-col gap-4">
      <StatStrip stats={[
        { label: "Issued", value: s ? String(s.totalIssued) : "—" },
        { label: "Redeemed", value: s ? String(s.totalRedeemed) : "—", tone: "ok" },
        { label: "Expired", value: s ? String(s.totalExpired) : "—", tone: "danger" },
        { label: "Redemption rate", value: s ? `${s.redemptionRate.toFixed(1)}%` : "—" },
        { label: "Discount value", value: s ? fmtMoney(s.totalDiscountValue) : "—" },
        { label: "Avg days to redeem", value: s?.avgDaysToRedemption != null ? s.avgDaysToRedemption.toFixed(1) : "—" },
      ]} />

      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {([["issuance", "Issuance"], ["redemption", "Redemption"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setView(id); setPage(1); }}
            className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", view === id ? "bg-brand-100 text-brand" : "text-ink-2 hover:bg-surface-2")}>{label}</button>
        ))}
      </div>

      <DataTable columns={isIssuance ? baseCols : redemptionCols} rows={rows} getRowId={(r) => String(r.id)} configured loading={loading} error={isError}
        page={page} maxPage={isIssuance ? Math.max(1, Math.ceil(total / LIMIT)) : 1} count={total} onPage={setPage}
        emptyText={isIssuance ? "No coupons issued in this period." : "No redemptions in this period."} countNoun="coupons" />
    </div>
  );
}
