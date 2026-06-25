import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface Option {
  value: string;
  label: string;
}

/** Compact checkbox dropdown for multi-value filters (status, source). */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  const count = selected.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-[38px] items-center gap-2 rounded-full border bg-surface pl-3.5 pr-3 text-sm outline-none",
          count > 0 ? "border-brand text-ink" : "border-border text-ink-2"
        )}
      >
        {label}
        {count > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-brand-fg">
            {count}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-ink-3" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-border bg-surface p-1 shadow-soft">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-ink-3">No options</div>
          ) : (
            options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className={cn(
                    "grid h-4 w-4 place-items-center rounded border",
                    on ? "border-brand bg-brand text-brand-fg" : "border-border"
                  )}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  {o.label}
                </button>
              );
            })
          )}
          {count > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-brand hover:bg-surface-2"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
