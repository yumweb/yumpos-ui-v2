import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { findReport } from "./data";

/**
 * Honest stub for an individual report. The report data comes from the legacy
 * reporting API and each report (filters + tables) is ported one at a time.
 */
export function ReportPlaceholder() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const report = findReport(slug);

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate("/reports")} className="flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> All reports
      </button>
      <div className="rounded-lg border border-border bg-surface p-12 text-center shadow-sm2">
        <h1 className="text-2xl font-bold">{report?.name ?? "Report"}</h1>
        {report && <p className="mx-auto mt-1 max-w-md text-ink-2">{report.desc}</p>}
        <p className="mx-auto mt-4 max-w-lg text-sm text-ink-3">
          This report is being ported from the legacy reporting API. No placeholder
          data is shown here on purpose.
        </p>
        <div className="mt-6">
          <Button variant="default" onClick={() => navigate("/reports")}>Back to Reports</Button>
        </div>
      </div>
    </div>
  );
}
