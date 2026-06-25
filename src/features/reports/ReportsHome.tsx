import { useNavigate } from "react-router-dom";
import { REPORT_SECTIONS, type ReportCard } from "./data";

export function ReportsHome() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-[25px] font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-ink-2">Pick a report to view. Grouped by area.</p>
      </div>

      {REPORT_SECTIONS.map((section) => {
        const SecIcon = section.icon;
        return (
          <section key={section.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <SecIcon className="h-[18px] w-[18px] text-brand" />
              <h2 className="text-base font-bold">{section.label}</h2>
              <span className="text-sm text-ink-3">· {section.reports.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.reports.map((r) => (
                <Card key={r.slug} report={r} onClick={() => navigate(`/reports/${r.slug}`)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Card({ report, onClick }: { report: ReportCard; onClick: () => void }) {
  const Icon = report.icon;
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-surface-2"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-ink group-hover:text-brand">{report.name}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{report.desc}</span>
      </span>
    </button>
  );
}
