import { Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { findSopDoc, SOP_CONTENT } from "./data";
import { useCopyGuard } from "./useCopyGuard";

const PROSE = [
  "text-[15px] leading-relaxed text-ink",
  "[&>:first-child]:mt-0",
  "[&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink",
  "[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-ink",
  "[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-ink",
  "[&_p]:my-3 [&_p]:text-ink-2",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ul]:text-ink-2",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_ol]:text-ink-2",
  "[&_li]:leading-relaxed [&_li>ul]:mt-1.5 [&_li>ol]:mt-1.5",
  "[&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic",
  "[&_a]:font-medium [&_a]:text-brand [&_a]:underline",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:border-border [&_table]:text-sm",
  "[&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold",
  "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:text-ink-2",
].join(" ");

export function DocumentView() {
  const { docId } = useParams();
  const navigate = useNavigate();
  useCopyGuard();

  const doc = findSopDoc(docId);
  const Content = docId ? SOP_CONTENT[docId] : undefined;

  if (!doc || !Content) {
    return (
      <div className="flex flex-col gap-5">
        <BackLink onClick={() => navigate("/best-practices")} />
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Document not found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink onClick={() => navigate("/best-practices")} />
        <div className="mt-2 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[25px] font-bold leading-tight tracking-tight">{doc.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{doc.category}</Badge>
              <span className="text-sm text-ink-2">{doc.description}</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="select-none p-6 sm:p-8">
        <Suspense fallback={<div className="flex items-center gap-2 py-6 text-ink-3"><Loader2 className="h-4 w-4 animate-spin" /> Loading content…</div>}>
          <div className={PROSE}>
            <Content />
          </div>
        </Suspense>
      </Card>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-brand">
      <ArrowLeft className="h-4 w-4" /> Back to Best Practices
    </button>
  );
}
