import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { isApiConfigured } from "@/lib/apiClient";
import { Card, Badge, type BadgeTone } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/DataTable";
import { getFirstVisit, getFirstVisitSummary, getFirstVisitDaily, type FirstVisitRow } from "../api";
import { fmtMoney, fmtDateTime } from "../dates";
import type { ParamValues, DateRange } from "../types";

const LIMIT = 20;
const statusTone = (s?: string | null): BadgeTone => s === "redeemed" ? "ok" : s === "pending" ? "warn" : s === "expired" ? "danger" : "default";

export function FirstVisitBody({ values }: { values: ParamValues }) {
  const range = values.range as DateRange;
  const enabled = isApiConfigured() && !!range?.from && !!range?.to;
  const [page, setPage] = useState(1);

  const summary = useQuery({ queryKey: ["fv-summary", range], enabled, queryFn: () => getFirstVisitSummary(range.from, range.to) });
  const daily = useQuery({ queryKey: ["fv-daily", range], enabled, queryFn: () => getFirstVisitDaily(range.from, range.to) });
  const list = useQuery({ queryKey: ["fv-list", range, page], enabled, placeholderData: keepPreviousData, queryFn: () => getFirstVisit(range.from, range.to, page, LIMIT) });

  const s = summary.data;
  const columns: Column<FirstVisitRow>[] = [
    { header: "Date", cell: (r) => fmtDateTime(r.firstVisitDate) },
    { header: "Customer", cell: (r) => r.customerName || "-" },
    { header: "Phone", cell: (r) => <span className="font-mono text-xs">{r.customerPhone}</span> },
    { header: "By", cell: (r) => r.employeeName || "-" },
    { header: "Sale", cell: (r) => fmtMoney(r.saleTotal), align: "right" },
    { header: "Bounce-back", cell: (r) => r.bounceBackIssued ? <Badge tone={statusTone(r.bounceBackCouponStatus)}>{r.bounceBackCouponStatus ?? "issued"}</Badge> : <span className="text-ink-3">Not issued</span> },
  ];
  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="First visits" value={s ? String(s.totalFirstVisits) : "—"} />
        <Tile label="Bounce-back issued" value={s ? String(s.bounceBackIssuedCount) : "—"} />
        <Tile label="Not issued" value={s ? String(s.bounceBackNotIssuedCount) : "—"} />
        <Tile label="Issuance rate" value={s ? `${s.issuanceRate.toFixed(1)}%` : "—"} tone="ok" />
      </div>

      {(daily.data?.length ?? 0) > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold">Daily first visits</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickFormatter={(d) => String(d).slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "var(--ink-3)" }} allowDecimals={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
              <Bar dataKey="total" name="First visits" fill="var(--brand)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="withBounceBack" name="With bounce-back" fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <DataTable columns={columns} rows={rows} getRowId={(r) => String(r.saleId)} configured loading={list.isLoading} error={list.isError}
        page={page} maxPage={Math.max(1, Math.ceil(total / LIMIT))} count={total} onPage={setPage} emptyText="No first visits in this period." countNoun="first visits" />
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return <Card className="p-3"><div className={`text-xl font-bold tnum ${tone === "ok" ? "text-ok" : ""}`}>{value}</div><div className="mt-0.5 text-xs text-ink-3">{label}</div></Card>;
}
