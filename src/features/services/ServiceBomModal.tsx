import { useEffect, useState } from "react";
import { Loader2, Trash2, Search } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useItemSearch } from "@/features/sales/api";
import { useServiceBom, useUpsertServiceBom, serviceName, type ServiceItem } from "./api";

interface Row {
  componentItemId: number;
  componentName: string;
  quantityPerService: number;
  active: boolean;
}

export function ServiceBomModal({ service, onClose, onSaved }: {
  service: ServiceItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = !!service;
  const serviceItemId = service?.itemId ?? null;
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

  const { data: bom, isLoading } = useServiceBom(serviceItemId, open);
  const { data: results } = useItemSearch(search.trim().length >= 2 ? search : "");
  const upsert = useUpsertServiceBom();

  useEffect(() => {
    if (!open) return;
    setSearch(""); setErr("");
    setRows((bom ?? []).map((r) => ({
      componentItemId: r.componentItemId,
      componentName: r.componentItem?.name ?? String(r.componentItemId),
      quantityPerService: Number(r.quantityPerService) || 1,
      active: !!r.active,
    })));
  }, [open, bom]);

  if (!service) return null;

  const addComponent = (id: number, name: string) => {
    if (rows.some((r) => r.componentItemId === id)) return;
    setRows((rs) => [...rs, { componentItemId: id, componentName: name, quantityPerService: 1, active: true }]);
    setSearch("");
  };
  const update = (idx: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const remove = (idx: number) => setRows((rs) => rs.filter((_, i) => i !== idx));

  function save() {
    for (const r of rows) {
      if (!(Number(r.quantityPerService) > 0)) { setErr("Quantity must be greater than 0 for every component."); return; }
    }
    setErr("");
    upsert.mutate(
      {
        serviceItemId: serviceItemId!,
        bom: rows.map((r) => ({
          componentItemId: r.componentItemId,
          quantityPerService: Number(r.quantityPerService),
          active: r.active,
        })),
      },
      { onSuccess: () => { onSaved(); onClose(); }, onError: () => setErr("Could not save the linked products.") }
    );
  }

  const available = (results ?? []).filter((r) => !rows.some((b) => b.componentItemId === Number(r.id)));

  return (
    <Modal open={open} onClose={onClose} title={`Linked Products · ${serviceName(service)}`} width="max-w-[640px]">
      <div className="grid gap-4 p-5">
        {/* Product search */}
        <div className="relative">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products to link…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </div>
          {search.trim().length >= 2 && available.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-surface shadow-soft">
              {available.map((r) => (
                <button key={r.id} type="button" onClick={() => addComponent(Number(r.id), r.name)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-ink-3">#{r.id} · add</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Components table */}
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[13.5px]">
            <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2 font-semibold">Component</th>
                <th className="w-32 px-3 py-2 font-semibold">Qty / service</th>
                <th className="w-20 px-3 py-2 font-semibold">Active</th>
                <th className="w-12 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-3">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-3">No linked products yet. Search and add above.</td></tr>
              ) : rows.map((row, idx) => (
                <tr key={`${row.componentItemId}-${idx}`} className="border-t border-border">
                  <td className="px-3 py-2"><span className="text-ink-3">#{row.componentItemId}</span> {row.componentName}</td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} step="0.001" value={row.quantityPerService}
                      onChange={(e) => update(idx, { quantityPerService: Number(e.target.value) })}
                      className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-brand" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={row.active}
                      onChange={(e) => update(idx, { active: e.target.checked })}
                      className="h-4 w-4 accent-[var(--brand)]" />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" aria-label="Remove" onClick={() => remove(idx)}
                      className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-[var(--danger-soft)] hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" onClick={save} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Linked Products
          </Button>
        </div>
      </div>
    </Modal>
  );
}
