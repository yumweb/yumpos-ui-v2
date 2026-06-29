import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Card, Button } from "@/components/ui/primitives";
import { getLocation } from "@/lib/auth";
import { MONTHS } from "../dates";
import type { ParamValues, MonthYear } from "../types";

const LEGACY_API = "https://api.yumpos.co/api";

/** GST report is generated as a CSV on the legacy host; we download it directly. */
export function GstBody({ values }: { values: ParamValues }) {
  const my = (values.my as MonthYear) ?? { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function download() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(LEGACY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Payload: { locationId: Number(getLocation()?.locationId), month: my.month, year: my.year },
          Header: { Object: "reports", Action: "GSTReport", Version: "v2" },
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gst_report_${my.month}_${my.year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr((e as Error)?.message || "Couldn’t generate the GST report.");
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-6 text-center">
      <h3 className="text-base font-bold">GST Report — {MONTHS[my.month - 1]} {my.year}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">The GST report is provided as a CSV file ready for filing. Pick the month and year above, then download.</p>
      {err && <div className="mx-auto mt-3 max-w-md rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}
      <div className="mt-4"><Button variant="primary" onClick={download} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download CSV</Button></div>
    </Card>
  );
}
