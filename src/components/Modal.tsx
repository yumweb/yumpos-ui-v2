import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Centered overlay modal. Click outside or the X to dismiss. */
export function Modal({ open, onClose, title, children, width = "max-w-[520px]" }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("max-h-[92vh] w-full overflow-auto rounded-lg border border-border bg-surface shadow-soft", width)}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink"><X className="h-5 w-5" /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

/** Two-column labelled field row used across the lead modals. */
export function FieldRow({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="grid grid-cols-[130px_1fr] items-center gap-3">
      <span className={cn("text-sm font-semibold", required ? "text-danger" : "text-ink-2")}>
        {label}{required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

export const fieldCls = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand";
