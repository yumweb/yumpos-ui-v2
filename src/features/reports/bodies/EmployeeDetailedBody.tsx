import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { Button } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/DataTable";
import { useEmployees } from "@/features/employees/api";
import { getEmployeeReport } from "../api";
import { startOfDay, endOfDay, fmtMoney } from "../dates";
import { downloadCsv } from "../csv";
import { StatStrip } from "../StatStrip";
import type { ParamValues, DateRange } from "../types";

interface Row { employeeId: number; name: string; services: number; products: number; redemptions: number; net: number }

export function EmployeeDetailedBody({ values }: { values: ParamValues }) {
  const range = values.range as DateRange;
  const employeeIds = (values.employeeIds as number[]) ?? [];
  const { data: employees = [] } = useEmployees();
  const nameOf = useMemo(() => {
    const m = new Map<number, string>();
    employees.forEach((e) => m.set(e.personId, `${e.firstName} ${e.lastName}`.trim() || e.username));
    return m;
  }, [employees]);

  const q = useQuery({
    queryKey: ["report", "employees-detailed", range, employeeIds],
    enabled: isApiConfigured() && !!range?.from && !!range?.to,
    queryFn: () => getEmployeeReport(startOfDay(range.from), endOfDay(range.to), employeeIds),
  });

  const rows: Row[] = useMemo(() => {
    const totals = q.data?.employeeTotals ?? {};
    return Object.entries(totals).map(([id, t]) => ({
      employeeId: Number(id),
      name: nameOf.get(Number(id)) ?? `#${id}`,
      services: t.grossTotalServices,
      products: t.grossTotalProducts,
      redemptions: t.totalRedemptions,
      net: t.grossTotalServices + t.grossTotalProducts - t.totalRedemptions,
    })).sort((a, b) => b.net - a.net);
  }, [q.data, nameOf]);

  const columns: Column<Row>[] = [
    { header: "Employee", cell: (r) => r.name },
    { header: "Service sales", cell: (r) => fmtMoney(r.services), align: "right" },
    { header: "Product sales", cell: (r) => fmtMoney(r.products), align: "right" },
    { header: "Redemptions", cell: (r) => fmtMoney(r.redemptions), align: "right" },
    { header: "Net total", cell: (r) => <span className="font-semibold">{fmtMoney(r.net)}</span>, align: "right" },
  ];

  const d = q.data;
  return (
    <div className="flex flex-col gap-4">
      {d && (
        <StatStrip stats={[
          { label: "Service sales", value: fmtMoney(d.overallGrossTotalServices) },
          { label: "Product sales", value: fmtMoney(d.overallGrossTotalProducts) },
          { label: "Redemptions", value: fmtMoney(d.overallTotalRedemptions) },
          { label: "Net total", value: fmtMoney(d.overallGrossTotalServices + d.overallGrossTotalProducts - d.overallTotalRedemptions) },
        ]} />
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-2">{q.isLoading ? "Loading…" : `${rows.length} employee${rows.length === 1 ? "" : "s"}`}</span>
        {rows.length > 0 && <Button variant="default" size="sm" onClick={() => downloadCsv("employees-detailed.csv", [["Employee", "Service sales", "Product sales", "Redemptions", "Net total"], ...rows.map((r) => [r.name, r.services, r.products, r.redemptions, r.net])])}><Download className="h-4 w-4" /> Export CSV</Button>}
      </div>
      <DataTable columns={columns} rows={rows} getRowId={(r) => String(r.employeeId)} configured loading={q.isLoading} error={q.isError} page={1} maxPage={1} count={rows.length} onPage={() => {}} emptyText="No employee sales for the selected period." countNoun="employees" />
    </div>
  );
}
