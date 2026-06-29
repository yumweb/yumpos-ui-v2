import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Check, Loader2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { Card } from "@/components/ui/primitives";
import { fieldCls } from "@/components/Modal";
import { getEmployeePerformance, saveEmployeeTarget, type PerformanceRow } from "../api";
import { fmtMoney, MONTHS } from "../dates";
import type { ParamValues, MonthYear } from "../types";

export function EmployeePerformanceBody({ values }: { values: ParamValues }) {
  const my = (values.my as MonthYear) ?? { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const q = useQuery({
    queryKey: ["report", "employee-performance", my.month, my.year],
    enabled: isApiConfigured(),
    queryFn: () => getEmployeePerformance(my.month, my.year),
  });

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-3 text-sm font-semibold">{MONTHS[my.month - 1]} {my.year} · targets are editable and save on blur</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
              <th className="px-3 py-3 pl-5 font-semibold">Employee</th>
              <th className="px-3 py-3 font-semibold">Service target</th>
              <th className="px-3 py-3 font-semibold">Service MTD</th>
              <th className="px-3 py-3 font-semibold">Service achieved</th>
              <th className="px-3 py-3 font-semibold">Retail target</th>
              <th className="px-3 py-3 font-semibold">Retail MTD</th>
              <th className="px-3 py-3 pr-5 font-semibold">Retail achieved</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-3">Loading…</td></tr>
            ) : q.isError ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm font-medium text-danger">Couldn’t load performance.</td></tr>
            ) : (q.data?.length ?? 0) === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-3">No employees found.</td></tr>
            ) : q.data!.map((r) => <PerfRow key={r.employeeId} row={r} month={my.month} year={my.year} />)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PerfRow({ row, month, year }: { row: PerformanceRow; month: number; year: number }) {
  const [service, setService] = useState(String(row.serviceTarget ?? 0));
  const [retail, setRetail] = useState(String(row.retailTarget ?? 0));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => { setService(String(row.serviceTarget ?? 0)); setRetail(String(row.retailTarget ?? 0)); }, [row.serviceTarget, row.retailTarget]);

  async function save() {
    if (Number(service) === row.serviceTarget && Number(retail) === row.retailTarget) return;
    setState("saving");
    try { await saveEmployeeTarget({ employeeId: row.employeeId, month, year, serviceTarget: Number(service) || 0, retailTarget: Number(retail) || 0 }); setState("saved"); setTimeout(() => setState("idle"), 1500); }
    catch { setState("idle"); }
  }

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2.5 pl-5 font-semibold">
        {row.employeeName}
        {state === "saving" && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-ink-3" />}
        {state === "saved" && <Check className="ml-2 inline h-3.5 w-3.5 text-ok" />}
      </td>
      <td className="px-3 py-2.5"><input value={service} onChange={(e) => setService(e.target.value)} onBlur={save} className={`${fieldCls} max-w-[120px]`} inputMode="numeric" /></td>
      <td className="px-3 py-2.5 tnum text-ink-2">{fmtMoney(row.serviceMtdTarget)}</td>
      <td className="px-3 py-2.5"><Achieved achieved={row.serviceAchieved} target={row.serviceMtdTarget} /></td>
      <td className="px-3 py-2.5"><input value={retail} onChange={(e) => setRetail(e.target.value)} onBlur={save} className={`${fieldCls} max-w-[120px]`} inputMode="numeric" /></td>
      <td className="px-3 py-2.5 tnum text-ink-2">{fmtMoney(row.retailMtdTarget)}</td>
      <td className="px-3 py-2.5 pr-5"><Achieved achieved={row.retailAchieved} target={row.retailMtdTarget} /></td>
    </tr>
  );
}

function Achieved({ achieved, target }: { achieved: number; target: number }) {
  const ok = achieved >= target && target > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tnum ${ok ? "text-ok" : "text-warn"}`}>
      {target > 0 ? (ok ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />) : null}
      {fmtMoney(achieved)}
    </span>
  );
}
