import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Send, Loader2, Users } from "lucide-react";
import { Card, Button } from "@/components/ui/primitives";
import { fieldCls } from "@/components/Modal";
import { WaGate } from "./WaGate";
import {
  useWaTemplates, useWaVariables, useCampaign,
  createCampaign, updateCampaign, startCampaign, previewAudience, addRecipients,
  type AudienceType, type CreateCampaign,
} from "./api";

const AUDIENCE_TYPES: { value: AudienceType; label: string; description: string }[] = [
  { value: "all_customers", label: "All customers", description: "Send to all customers with phone numbers" },
  { value: "segment", label: "Customer segment", description: "Filter customers by criteria" },
  { value: "retention", label: "Lost customers (60+ days)", description: "Mirrors the Customer Retention Report — customers inactive for 60+ days" },
  { value: "manual", label: "Manual list", description: "Enter phone numbers manually" },
];
const RETENTION_STATUS = [["", "Any"], ["not-connected", "Not connected"], ["prospective", "Prospective"], ["appointment-booked", "Appointment booked"], ["lost", "Lost"]];
const YEARS = (() => { const y = new Date().getFullYear(); const out = [["", "All years"]]; for (let i = y; i >= 2020; i--) out.push([String(i), String(i)]); return out; })();

interface FormState {
  name: string; description: string; templateName: string; templateLanguage: string;
  templateVariables: { body: string[] };
  audienceType: AudienceType;
  audienceFilter: { lastVisitDays: string; minSpend: string; gender: string; retentionStatus: string; year: string };
  manualPhones: string; scheduledAt: string;
}
const EMPTY: FormState = {
  name: "", description: "", templateName: "", templateLanguage: "en", templateVariables: { body: [] },
  audienceType: "all_customers", audienceFilter: { lastVisitDays: "", minSpend: "", gender: "", retentionStatus: "", year: "" },
  manualPhones: "", scheduledAt: "",
};

export function CampaignForm() {
  return <WaGate><CampaignFormInner /></WaGate>;
}

function CampaignFormInner() {
  const nav = useNavigate();
  const { campaignId } = useParams();
  const isEdit = !!campaignId;
  const id = campaignId ? Number(campaignId) : undefined;

  const { data: allTemplates = [], isLoading: tplLoading } = useWaTemplates();
  const templates = useMemo(() => allTemplates.filter((t) => t.status === "APPROVED" && t.category === "MARKETING"), [allTemplates]);
  const { data: variables = [] } = useWaVariables();
  const { data: existing, isLoading: loadingExisting } = useCampaign(isEdit ? id : undefined);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  // Hydrate when editing
  useEffect(() => {
    if (existing) {
      setForm((f) => ({
        ...f,
        name: existing.name || "", description: existing.description || "",
        templateName: existing.templateName || "", templateLanguage: existing.templateLanguage || "en",
        templateVariables: existing.templateVariables?.body ? { body: existing.templateVariables.body } : { body: [] },
        audienceType: existing.audienceType || "all_customers",
        audienceFilter: { lastVisitDays: "", minSpend: "", gender: "", retentionStatus: "", year: "", ...(existing.audienceFilter as object) },
        scheduledAt: existing.scheduledAt ? new Date(existing.scheduledAt).toISOString().slice(0, 16) : "",
      }));
    }
  }, [existing]);

  const selectedTemplate = useMemo(() => templates.find((t) => t.name === form.templateName) ?? null, [templates, form.templateName]);

  // When template changes, size the body-variable array to its {{n}} count.
  useEffect(() => {
    if (!selectedTemplate) return;
    const body = selectedTemplate.components?.find((c) => c.type === "BODY")?.text || "";
    const n = (body.match(/\{\{\d+\}\}/g) || []).length;
    setForm((f) => {
      const cur = f.templateVariables.body;
      if (cur.length === n) return f;
      return { ...f, templateVariables: { body: Array.from({ length: n }, (_, i) => cur[i] ?? "") } };
    });
  }, [selectedTemplate]);

  const filterPayload = useMemo((): Record<string, string> | undefined => {
    if (form.audienceType === "segment") return { lastVisitDays: form.audienceFilter.lastVisitDays, minSpend: form.audienceFilter.minSpend, gender: form.audienceFilter.gender };
    if (form.audienceType === "retention") {
      const f: Record<string, string> = {};
      if (form.audienceFilter.retentionStatus) f.retentionStatus = form.audienceFilter.retentionStatus;
      if (form.audienceFilter.year) f.year = form.audienceFilter.year;
      return f;
    }
    return undefined;
  }, [form.audienceType, form.audienceFilter]);

  // Preview audience count on filter change (skip manual)
  useEffect(() => {
    if (form.audienceType === "manual") { setCount(null); return; }
    let cancelled = false;
    setCountLoading(true);
    previewAudience(form.audienceType, filterPayload)
      .then((r) => { if (!cancelled) setCount(r.count ?? 0); })
      .catch(() => { if (!cancelled) setCount(null); })
      .finally(() => { if (!cancelled) setCountLoading(false); });
    return () => { cancelled = true; };
  }, [form.audienceType, filterPayload]);

  const setVar = (i: number, v: string) => setForm((f) => { const body = [...f.templateVariables.body]; body[i] = v; return { ...f, templateVariables: { body } }; });

  const preview = useMemo(() => {
    const body = selectedTemplate?.components?.find((c) => c.type === "BODY")?.text;
    if (!body) return null;
    let out = body;
    form.templateVariables.body.forEach((val, i) => {
      const token = /^\{\{([a-z0-9_]+)\}\}$/.exec(val || "");
      const matched = token ? variables.find((v) => v.varKey === token[1]) : null;
      out = out.replace(`{{${i + 1}}}`, matched ? (matched.sample || matched.label) : (val || `[Variable ${i + 1}]`));
    });
    return out;
  }, [selectedTemplate, form.templateVariables, variables]);

  async function save(startNow: boolean) {
    if (!form.name.trim()) { setError("Campaign name is required."); return; }
    if (!form.templateName) { setError("Please select a template."); return; }
    const emptyIdx = form.templateVariables.body.findIndex((v) => !v || !v.trim());
    if (emptyIdx !== -1) { setError(`Variable {{${emptyIdx + 1}}} is empty — fill it with a static value or a placeholder like {{customer_name}}.`); return; }

    setSaving(true); setError(null);
    try {
      const payload: CreateCampaign = {
        name: form.name, description: form.description, templateName: form.templateName, templateLanguage: form.templateLanguage,
        templateVariables: form.templateVariables, audienceType: form.audienceType, audienceFilter: filterPayload,
        scheduledAt: form.scheduledAt || undefined,
      };
      const res = isEdit && id ? await updateCampaign(id, payload) : await createCampaign(payload);
      const newId = res?.id ?? id;
      if (newId && form.audienceType === "manual" && form.manualPhones.trim()) {
        const phones = form.manualPhones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
        if (phones.length) await addRecipients(newId, phones);
      }
      if (startNow && newId) await startCampaign(newId);
      nav("/whatsapp/campaigns");
    } catch (e) {
      setError((e as Error)?.message || "Failed to save campaign.");
    } finally { setSaving(false); }
  }

  if (isEdit && loadingExisting) return <div className="grid min-h-[40vh] place-items-center text-ink-3"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => nav("/whatsapp/campaigns")}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <h1 className="text-[25px] font-bold tracking-tight">{isEdit ? "Edit campaign" : "Create campaign"}</h1>
      </div>

      {error && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="flex flex-wrap items-start gap-5">
        {/* Form */}
        <Card className="min-w-[420px] flex-1 p-5">
          <h2 className="mb-3 text-base font-bold">Campaign details</h2>
          <div className="flex flex-col gap-3">
            <Field label="Campaign name" required><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={fieldCls} placeholder="e.g., Summer Sale Promo" /></Field>
            <Field label="Description"><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={fieldCls} placeholder="Optional, for internal reference" /></Field>

            <Field label="Message template" required>
              <select value={form.templateName} onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))} disabled={tplLoading} className={fieldCls}>
                <option value="">{tplLoading ? "Loading templates…" : templates.length === 0 ? "No approved marketing templates" : "Select a template"}</option>
                {templates.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.language})</option>)}
              </select>
            </Field>

            {selectedTemplate && form.templateVariables.body.length > 0 && (
              <div className="rounded-md bg-surface-2 p-3">
                <p className="mb-2 text-xs font-semibold text-ink-3">Map template variables</p>
                {form.templateVariables.body.map((val, i) => {
                  const token = /^\{\{([a-z0-9_]+)\}\}$/.exec(val || "");
                  const matched = token ? variables.find((v) => v.varKey === token[1]) : null;
                  const sel = matched ? matched.varKey : "__custom__";
                  return (
                    <div key={i} className="mb-2 flex items-start gap-2">
                      <select value={sel} onChange={(e) => setVar(i, e.target.value === "__custom__" ? "" : `{{${e.target.value}}}`)} className={`${fieldCls} max-w-[220px]`}>
                        {variables.map((v) => <option key={v.varKey} value={v.varKey}>{v.label}</option>)}
                        <option value="__custom__">Custom text…</option>
                      </select>
                      {sel === "__custom__" && <input value={val} onChange={(e) => setVar(i, e.target.value)} className={fieldCls} placeholder={`Variable {{${i + 1}}} — fixed text`} />}
                    </div>
                  );
                })}
                <p className="text-xs text-ink-3">Dynamic variables are filled per customer at send time; “Custom text” sends the same value to everyone.</p>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink-2">Audience</p>
              <div className="space-y-1.5">
                {AUDIENCE_TYPES.map((t) => (
                  <label key={t.value} className="flex items-start gap-2">
                    <input type="radio" name="audience" checked={form.audienceType === t.value} onChange={() => setForm((f) => ({ ...f, audienceType: t.value }))} className="mt-1" />
                    <span><span className="text-sm font-medium">{t.label}</span><span className="block text-xs text-ink-3">{t.description}</span></span>
                  </label>
                ))}
              </div>
            </div>

            {form.audienceType === "segment" && (
              <div className="flex flex-wrap gap-2 rounded-md bg-surface-2 p-3">
                <LabeledInput label="Last visit (days)" type="number" value={form.audienceFilter.lastVisitDays} onChange={(v) => setForm((f) => ({ ...f, audienceFilter: { ...f.audienceFilter, lastVisitDays: v } }))} />
                <LabeledInput label="Min spend" type="number" value={form.audienceFilter.minSpend} onChange={(v) => setForm((f) => ({ ...f, audienceFilter: { ...f.audienceFilter, minSpend: v } }))} />
                <div className="w-[150px]">
                  <span className="mb-1 block text-xs text-ink-3">Gender</span>
                  <select value={form.audienceFilter.gender} onChange={(e) => setForm((f) => ({ ...f, audienceFilter: { ...f.audienceFilter, gender: e.target.value } }))} className={fieldCls}>
                    <option value="">Any</option><option value="male">Male</option><option value="female">Female</option>
                  </select>
                </div>
              </div>
            )}

            {form.audienceType === "retention" && (
              <div className="rounded-md bg-surface-2 p-3">
                <p className="mb-2 text-xs text-ink-3">Mirrors the Customer Retention Report. Inactivity threshold fixed at 60 days.</p>
                <div className="flex flex-wrap gap-2">
                  <div className="min-w-[200px]">
                    <span className="mb-1 block text-xs text-ink-3">Retention status</span>
                    <select value={form.audienceFilter.retentionStatus} onChange={(e) => setForm((f) => ({ ...f, audienceFilter: { ...f.audienceFilter, retentionStatus: e.target.value } }))} className={fieldCls}>
                      {RETENTION_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="min-w-[150px]">
                    <span className="mb-1 block text-xs text-ink-3">Year of last sale</span>
                    <select value={form.audienceFilter.year} onChange={(e) => setForm((f) => ({ ...f, audienceFilter: { ...f.audienceFilter, year: e.target.value } }))} className={fieldCls}>
                      {YEARS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {form.audienceType === "manual" && (
              <Field label="Phone numbers">
                <textarea value={form.manualPhones} onChange={(e) => setForm((f) => ({ ...f, manualPhones: e.target.value }))} rows={4} className={fieldCls} placeholder="One per line or comma-separated. Include country code (e.g., 919876543210)." />
              </Field>
            )}

            <Field label="Schedule"><input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} className={fieldCls} /><span className="text-xs text-ink-3">Leave empty to send immediately when started.</span></Field>
          </div>
        </Card>

        {/* Preview + audience + actions */}
        <div className="w-[340px] space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold">Preview</h3>
            {selectedTemplate ? (
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="ml-auto max-w-[90%] rounded-lg bg-brand-100 p-2.5 text-sm text-ink"><p className="whitespace-pre-wrap">{preview}</p></div>
              </div>
            ) : <p className="text-sm text-ink-3">Select a template to see a preview.</p>}
          </Card>

          {form.audienceType !== "manual" && (
            <Card className="p-4">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Users className="h-4 w-4" /> Audience</div>
              {countLoading ? (
                <div className="flex items-center gap-2 text-sm text-ink-3"><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-brand">{(count ?? 0).toLocaleString("en-IN")}</div>
                  <p className="text-sm text-ink-3">customers will receive this message</p>
                  {!!count && count > 0 && (
                    <div className="mt-2 text-xs text-ink-3">Estimated cost <span className="font-bold text-warn">~₹{(count * 0.8).toFixed(2)}</span> (₹0.80/message, marketing)</div>
                  )}
                </>
              )}
            </Card>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={() => save(false)} disabled={saving} className="w-full justify-center">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {isEdit ? "Save changes" : "Save as draft"}
            </Button>
            {!isEdit && (
              <Button variant="accent" onClick={() => save(true)} disabled={saving || count === 0} className="w-full justify-center">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Create & start
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={`mb-1 block text-sm font-semibold ${required ? "text-ink" : "text-ink-2"}`}>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}
function LabeledInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="w-[150px]">
      <span className="mb-1 block text-xs text-ink-3">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} />
    </div>
  );
}
