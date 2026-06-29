import { useNavigate } from "react-router-dom";
import { FileText, ChevronRight } from "lucide-react";
import { SOP_DOCS, type SopDoc } from "./data";

/** Best Practices & SOPs index — static documents grouped by category. */
export function BestPractices() {
  const navigate = useNavigate();
  const categories = [...new Set(SOP_DOCS.map((d) => d.category))];

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-[25px] font-bold tracking-tight">Best Practices &amp; SOPs</h1>
        <p className="mt-1 text-sm text-ink-2">Standard operating procedures and guidelines for the salon.</p>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="flex flex-col gap-3">
          <h2 className="text-base font-bold">{cat}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOP_DOCS.filter((d) => d.category === cat).map((doc) => (
              <Card key={doc.id} doc={doc} onClick={() => navigate(`/best-practices/${doc.id}`)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Card({ doc, onClick }: { doc: SopDoc; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-surface-2"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand">
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink group-hover:text-brand">{doc.title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{doc.description}</span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-3 group-hover:text-brand" />
    </button>
  );
}
