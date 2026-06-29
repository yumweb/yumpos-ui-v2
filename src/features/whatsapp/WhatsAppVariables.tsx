import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Lock } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { getUser } from "@/lib/auth";
import { isApiConfigured } from "@/lib/apiClient";
import {
  useAllWaVariables, createWaVariable, updateWaVariable, deleteWaVariable,
  VARIABLE_SOURCES, type WaVariable,
} from "./api";

interface EditState { id?: number; varKey: string; label: string; sample: string; source: string; isActive: boolean; sortOrder: string }
const EMPTY: EditState = { varKey: "", label: "", sample: "", source: "CUSTOMER_FIRST_NAME", isActive: true, sortOrder: "0" };
const sourceLabel = (v?: string) => VARIABLE_SOURCES.find((s) => s.value === v)?.label ?? v ?? "-";

export function WhatsAppVariables() {
  const u = getUser<{ isCorporate?: boolean }>();
  const isCorporate = !!u?.isCorporate;
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useAllWaVariables(isCorporate);

  const [edit, setEdit] = useState<EditState | null>(null);
  const [toDelete, setToDelete] = useState<WaVariable | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["wa-variables-all"] });

  async function save() {
    if (!edit) return;
    if (!edit.varKey.trim() || !edit.label.trim()) { setErr("Key and label are required."); return; }
    setSaving(true); setErr(null);
    try {
      const body = { varKey: edit.varKey.trim(), label: edit.label.trim(), sample: edit.sample.trim() || undefined, source: edit.source, isActive: edit.isActive, sortOrder: Number(edit.sortOrder) || 0 };
      const res = edit.id ? await updateWaVariable(edit.id, body) : await createWaVariable(body);
      if (res?.message && !res?.id) throw new Error(res.message);
      setEdit(null); refresh();
    } catch (e) { setErr((e as Error)?.message || "Failed to save variable."); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!toDelete) return;
    try { await deleteWaVariable(toDelete.id); setToDelete(null); refresh(); }
    catch { setErr("Failed to delete variable."); }
  }

  if (!isApiConfigured()) {
    return <Shell><div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Connect the API to manage variables.</div></Shell>;
  }
  if (!isCorporate) {
    return (
      <Shell>
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Lock className="mx-auto mb-3 h-7 w-7 text-ink-3" />
          <p className="text-sm font-medium text-ink-2">Managing WhatsApp variables is restricted to corporate users.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell action={<Button variant="primary" onClick={() => { setErr(null); setEdit({ ...EMPTY }); }}><Plus className="h-4 w-4" /> Add variable</Button>}>
      {err && !edit && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}
      <Card className="overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
              <th className="px-3 py-3 pl-5 font-semibold">Label</th><th className="px-3 py-3 font-semibold">Token</th>
              <th className="px-3 py-3 font-semibold">Source</th><th className="px-3 py-3 font-semibold">Sample</th>
              <th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 pr-5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-3">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-3">No variables yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-surface-2">
                <td className="px-3 py-2.5 pl-5 font-semibold">{r.label}</td>
                <td className="px-3 py-2.5"><code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{`{{${r.varKey}}}`}</code></td>
                <td className="px-3 py-2.5 text-ink-2">{sourceLabel(r.source)}</td>
                <td className="px-3 py-2.5 text-ink-2">{r.sample || "-"}</td>
                <td className="px-3 py-2.5"><Badge tone={r.isActive ? "ok" : "default"}>{r.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="px-3 py-2.5 pr-5">
                  <div className="flex gap-1">
                    <button onClick={() => { setErr(null); setEdit({ id: r.id, varKey: r.varKey, label: r.label, sample: r.sample ?? "", source: r.source ?? "CUSTOMER_FIRST_NAME", isActive: r.isActive ?? true, sortOrder: String(r.sortOrder ?? 0) }); }}
                      className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-surface" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setToDelete(r)} className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Add / edit */}
      <Modal open={!!edit} onClose={() => !saving && setEdit(null)} title={edit?.id ? "Edit variable" : "Add variable"}>
        {edit && (
          <>
            <div className="space-y-3 p-5">
              {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}
              <FieldRow label="Label" required><input value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} className={fieldCls} placeholder="Customer First Name" /></FieldRow>
              <FieldRow label="Token key" required><input value={edit.varKey} onChange={(e) => setEdit({ ...edit, varKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} className={fieldCls} placeholder="first_name" /></FieldRow>
              <p className="-mt-1 pl-[142px] text-xs text-ink-3">Used as <code>{`{{${edit.varKey || "key"}}}`}</code> — lowercase, digits, underscore.</p>
              <FieldRow label="Source" required>
                <select value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} className={fieldCls}>
                  {VARIABLE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Sample"><input value={edit.sample} onChange={(e) => setEdit({ ...edit, sample: e.target.value })} className={fieldCls} placeholder="John (shown in previews)" /></FieldRow>
              <FieldRow label="Sort order"><input type="number" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value })} className={fieldCls} /></FieldRow>
              <FieldRow label="Active"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Resolve dynamically in campaigns</label></FieldRow>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="ghost" onClick={() => setEdit(null)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete variable?">
        <div className="p-5"><p className="text-sm text-ink-2">Remove <strong>{toDelete?.label}</strong> (<code className="font-mono text-xs">{`{{${toDelete?.varKey}}}`}</code>)? Templates and campaigns already using this token keep their text, but it will no longer resolve dynamically.</p></div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => setToDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={remove}>Delete</Button>
        </div>
      </Modal>
    </Shell>
  );
}

function Shell({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight">WhatsApp Variables</h1>
          <p className="mt-1 text-sm text-ink-2">Predefined merge fields used in template building and campaign mapping.</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
