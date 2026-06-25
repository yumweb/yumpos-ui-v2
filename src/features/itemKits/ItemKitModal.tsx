import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Search } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useItemSearch } from "@/features/sales/api";
import { useCategoryTree, flattenCategories } from "@/features/retail/api";
import {
  useItemKitDetail, useCreateItemKit, useUpdateItemKit, type ItemKitInput, type KitLine,
} from "./api";

export function ItemKitModal({ open, editId, onClose, onSaved }: {
  open: boolean; editId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = editId != null;
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<KitLine[]>([]);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

  const { data: detail, isLoading: detailLoading } = useItemKitDetail(editId, open && isEdit);
  const { data: tree } = useCategoryTree();
  const { data: results } = useItemSearch(search.trim().length >= 2 ? search : "");
  const create = useCreateItemKit();
  const update = useUpdateItemKit();
  const pending = create.isPending || update.isPending;
  const flatCats = useMemo(() => flattenCategories(tree ?? []), [tree]);

  useEffect(() => {
    if (!open) return;
    setSearch(""); setErr("");
    if (isEdit && detail?.itemkit) {
      const k = detail.itemkit;
      setName(k.name ?? "");
      setCategoryId(k.categoryId != null ? String(k.categoryId) : "");
      setPrice(k.unitPrice != null ? String(Number(k.unitPrice)) : "");
      setDescription(k.description ?? "");
      setLines((k.itemkitItems ?? []).map((it) => ({
        itemId: it.itemId, name: it.item?.name ?? String(it.itemId), quantity: Number(it.quantity) || 1,
      })));
    } else if (!isEdit) {
      setName(""); setCategoryId(""); setPrice(""); setDescription(""); setLines([]);
    }
  }, [open, isEdit, detail]);

  if (!open) return null;

  const addLine = (id: number, nm: string) => {
    setLines((ls) => ls.some((l) => l.itemId === id) ? ls.map((l) => l.itemId === id ? { ...l, quantity: l.quantity + 1 } : l) : [...ls, { itemId: id, name: nm, quantity: 1 }]);
    setSearch("");
  };
  const setQty = (id: number, q: number) => setLines((ls) => ls.map((l) => l.itemId === id ? { ...l, quantity: q } : l));
  const remove = (id: number) => setLines((ls) => ls.filter((l) => l.itemId !== id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return setErr("Add at least one item to the kit.");
    if (!name.trim()) return setErr("Item kit name is required.");
    if (!categoryId) return setErr("Category is required.");
    if (!price.trim() || !(Number(price) > 0)) return setErr("A valid price is required.");
    for (const l of lines) if (!(l.quantity > 0)) return setErr("Every item needs a quantity greater than 0.");
    setErr("");
    const input: ItemKitInput = { name, description, categoryId: Number(categoryId), price: Number(price), lines };
    const opts = { onSuccess: () => { onSaved(); onClose(); }, onError: () => setErr(`Could not ${isEdit ? "update" : "create"} the item kit.`) };
    if (isEdit && editId != null) update.mutate({ id: editId, input }, opts);
    else create.mutate(input, opts);
  }

  const available = (results ?? []).filter((r) => !lines.some((l) => l.itemId === Number(r.id)));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Item Kit" : "New Item Kit"} width="max-w-[640px]">
      <form onSubmit={submit} className="grid gap-3 p-5">
        {isEdit && detailLoading ? (
          <div className="py-8 text-center text-ink-3">Loading…</div>
        ) : (
          <>
            {/* Item search */}
            <div className="relative">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                <Search className="h-4 w-4 text-ink-3" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items to add to the kit…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3" />
              </div>
              {search.trim().length >= 2 && available.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-surface shadow-soft">
                  {available.map((r) => (
                    <button key={r.id} type="button" onClick={() => addLine(Number(r.id), r.name)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                      <span className="font-medium">{r.name}</span><span className="text-xs text-ink-3">#{r.id} · add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Kit items */}
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-[13.5px]">
                <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <tr><th className="px-3 py-2 font-semibold">Item</th><th className="w-28 px-3 py-2 font-semibold">Qty</th><th className="w-12 px-3 py-2"></th></tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-ink-3">No items yet. Search and add above.</td></tr>
                  ) : lines.map((l) => (
                    <tr key={l.itemId} className="border-t border-border">
                      <td className="px-3 py-2"><span className="text-ink-3">#{l.itemId}</span> {l.name}</td>
                      <td className="px-3 py-2">
                        <input type="number" min={1} step="1" value={l.quantity}
                          onChange={(e) => setQty(l.itemId, Number(e.target.value))}
                          className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-brand" />
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" aria-label="Remove" onClick={() => remove(l.itemId)}
                          className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-[var(--danger-soft)] hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FieldRow label="Item Kit Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
            </FieldRow>
            <FieldRow label="Category" required>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldCls}>
                <option value="">Select category…</option>
                {flatCats.map((c) => <option key={c.id} value={String(c.id)}>{c.label}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Price (incl. tax)" required>
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={fieldCls} placeholder="Enter price including tax" />
            </FieldRow>
            <FieldRow label="Description">
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={fieldCls} />
            </FieldRow>

            {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {isEdit ? "Save changes" : "Create item kit"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
