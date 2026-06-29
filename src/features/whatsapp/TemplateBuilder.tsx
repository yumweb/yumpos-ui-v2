import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2, Braces, CheckCircle2 } from "lucide-react";
import { Card, Button } from "@/components/ui/primitives";
import { fieldCls } from "@/components/Modal";
import { cn } from "@/lib/cn";
import { WaGate } from "./WaGate";
import {
  useWaVariables, getTemplateByName, createTemplate, updateTemplate, createTemplateWithMedia,
  type TemplateCategory, type HeaderFormat, type TemplateComponent, type TemplateButton, type WaVariable, type WaTemplate,
} from "./api";

const LANGUAGES = [
  ["en", "English"], ["en_US", "English (US)"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"],
  ["mr", "Marathi"], ["gu", "Gujarati"], ["kn", "Kannada"], ["ml", "Malayalam"], ["bn", "Bengali"], ["pa", "Punjabi"],
];
const CATEGORIES: { value: TemplateCategory; label: string; description: string }[] = [
  { value: "MARKETING", label: "Marketing", description: "Promotional content and updates" },
  { value: "UTILITY", label: "Utility", description: "Transactional messages like confirmations" },
  { value: "AUTHENTICATION", label: "Authentication", description: "OTP and verification codes" },
];
const BUTTON_TYPES: { value: TemplateButton["type"]; label: string; max: number }[] = [
  { value: "QUICK_REPLY", label: "Quick reply", max: 10 },
  { value: "URL", label: "Website link", max: 2 },
  { value: "PHONE_NUMBER", label: "Call button", max: 1 },
];
const MEDIA: Record<Exclude<HeaderFormat, "TEXT">, { accept: string; maxMb: number }> = {
  IMAGE: { accept: "image/jpeg,image/png", maxMb: 5 },
  VIDEO: { accept: "video/mp4,video/3gpp", maxMb: 16 },
  DOCUMENT: { accept: "application/pdf", maxMb: 100 },
};
type HeaderType = "NONE" | HeaderFormat;

interface BtnState { type: TemplateButton["type"]; text: string; url: string; phone_number: string; url_example: string }
const extractVars = (text: string) => [...new Set(text.match(/\{\{(\d+)\}\}/g) ?? [])].sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

export function TemplateBuilder() {
  return <WaGate><Inner /></WaGate>;
}

function Inner() {
  const nav = useNavigate();
  const { templateName } = useParams();
  const isEdit = !!templateName;
  const { data: catalog = [] } = useWaVariables();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("MARKETING");
  const [language, setLanguage] = useState("en");
  const [headerType, setHeaderType] = useState<HeaderType>("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerExample, setHeaderExample] = useState("");
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null);
  const [bodyText, setBodyText] = useState("");
  const [bodyExamples, setBodyExamples] = useState<string[]>([]);
  const [footerOn, setFooterOn] = useState(false);
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<BtnState[]>([]);

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const headerVars = extractVars(headerText);
  const bodyVars = extractVars(bodyText);

  // keep bodyExamples length synced to the number of body variables
  useEffect(() => {
    setBodyExamples((prev) => {
      const n = bodyVars.length;
      if (prev.length === n) return prev;
      return n < prev.length ? prev.slice(0, n) : [...prev, ...Array(n - prev.length).fill("")];
    });
  }, [bodyVars.length]);

  // edit: load + map existing template back into form
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await getTemplateByName(templateName!);
        const t = (Array.isArray(res) ? res[0] : res) as WaTemplate | undefined;
        if (!t) { setError("Template not found."); return; }
        setTemplateId(String(t.id ?? t.name));
        setName(t.name); setCategory((t.category as TemplateCategory) ?? "MARKETING"); setLanguage(t.language ?? "en");
        if (t.header_media_url) { setHeaderType((t.header_media_type as HeaderFormat) ?? "IMAGE"); setExistingMediaUrl(t.header_media_url); }
        for (const c of t.components ?? []) {
          if (c.type === "HEADER" && (c.format === "TEXT" || !c.format)) { setHeaderType("TEXT"); setHeaderText(c.text ?? ""); setHeaderExample(c.example?.header_text?.[0] ?? ""); }
          else if (c.type === "HEADER" && c.format) { setHeaderType(c.format as HeaderFormat); }
          else if (c.type === "BODY") { setBodyText(c.text ?? ""); setBodyExamples(c.example?.body_text?.[0] ?? []); }
          else if (c.type === "FOOTER") { setFooterOn(true); setFooterText(c.text ?? ""); }
          else if (c.type === "BUTTONS") {
            setButtons((c.buttons ?? []).map((b) => ({ type: b.type, text: b.text, url: b.url ?? "", phone_number: b.phone_number ?? "", url_example: b.example?.[0] ?? "" })));
          }
        }
      } catch { setError("Could not load the template."); }
      finally { setLoading(false); }
    })();
  }, [isEdit, templateName]);

  function insertVar(token: string, sampleForExample?: string) {
    const el = bodyRef.current;
    const next = bodyVars.length + 1;
    const placeholder = token || `{{${next}}}`;
    const start = el?.selectionStart ?? bodyText.length;
    const updated = bodyText.slice(0, start) + placeholder + bodyText.slice(el?.selectionEnd ?? start);
    setBodyText(updated);
    if (sampleForExample !== undefined && /\{\{\d+\}\}/.test(placeholder)) {
      const idx = Number(placeholder.match(/\d+/)![0]) - 1;
      setBodyExamples((prev) => { const a = [...prev]; while (a.length <= idx) a.push(""); a[idx] = sampleForExample; return a; });
    }
  }

  function addButton(type: TemplateButton["type"]) {
    const def = BUTTON_TYPES.find((b) => b.value === type)!;
    if (buttons.filter((b) => b.type === type).length >= def.max) { setError(`Maximum ${def.max} ${def.label.toLowerCase()} button(s) allowed.`); return; }
    setButtons((b) => [...b, { type, text: "", url: "", phone_number: "", url_example: "" }]);
  }
  const setBtn = (i: number, patch: Partial<BtnState>) => setButtons((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function buildComponents(): TemplateComponent[] {
    const c: TemplateComponent[] = [];
    if (headerType === "TEXT" && headerText.trim()) {
      const h: TemplateComponent = { type: "HEADER", format: "TEXT", text: headerText };
      if (headerVars.length > 0 && headerExample) h.example = { header_text: [headerExample] };
      c.push(h);
    } else if (headerType !== "NONE" && headerType !== "TEXT") {
      c.push({ type: "HEADER", format: headerType });
    }
    const body: TemplateComponent = { type: "BODY", text: bodyText };
    if (bodyVars.length > 0) body.example = { body_text: [bodyExamples] };
    c.push(body);
    if (footerOn && footerText.trim()) c.push({ type: "FOOTER", text: footerText });
    if (buttons.length > 0) {
      c.push({
        type: "BUTTONS",
        buttons: buttons.map((b) => {
          const o: TemplateButton = { type: b.type, text: b.text };
          if (b.type === "URL" && b.url) { o.url = b.url; if (b.url.includes("{{1}}") && b.url_example) o.example = [b.url_example]; }
          if (b.type === "PHONE_NUMBER" && b.phone_number) o.phone_number = b.phone_number;
          return o;
        }),
      });
    }
    return c;
  }

  function validate(): string | null {
    if (!isEdit) {
      if (!name.trim()) return "Template name is required.";
      if (!/^[a-z][a-z0-9_]*$/.test(name)) return "Name must be lowercase, start with a letter, and use only letters, numbers and underscores.";
    }
    if (!bodyText.trim()) return "Message body is required.";
    if (bodyText.length > 1024) return `Body exceeds 1024 characters (${bodyText.length}).`;
    if (bodyVars.length > 0 && bodyVars.some((_, i) => !bodyExamples[i]?.trim())) return "Every body variable needs a sample value.";
    if (headerType === "TEXT" && headerVars.length > 0 && !headerExample.trim()) return "The header variable needs a sample value.";
    if (!isEdit && headerType !== "NONE" && headerType !== "TEXT" && !headerFile) return "Upload a media file for the header.";
    if (footerOn && footerText.length > 60) return `Footer exceeds 60 characters (${footerText.length}).`;
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      if (!b.text.trim()) return `Button ${i + 1} needs button text.`;
      if (b.type === "URL" && !b.url.trim()) return `Button ${i + 1} needs a URL.`;
      if (b.type === "URL" && b.url.includes("{{1}}") && !b.url_example.trim()) return `Button ${i + 1} needs a sample for its dynamic URL.`;
      if (b.type === "PHONE_NUMBER" && !b.phone_number.trim()) return `Button ${i + 1} needs a phone number.`;
    }
    return null;
  }

  async function submit() {
    const v = validate();
    setError(v); if (v) return;
    setSaving(true); setSuccess(null);
    try {
      const components = buildComponents();
      const isMedia = headerType !== "NONE" && headerType !== "TEXT";
      if (isEdit && templateId) await updateTemplate(templateId, { components });
      else if (isMedia && headerFile) await createTemplateWithMedia({ name, language, category, components }, headerFile);
      else await createTemplate({ name, language, category, components });
      setSuccess(isEdit ? "Template updated." : "Template submitted for approval.");
      setTimeout(() => nav("/whatsapp"), 1500);
    } catch (e) { setError((e as Error)?.message || "Failed to save the template."); }
    finally { setSaving(false); }
  }

  function pickFile(f: File | null) {
    setError(null);
    if (!f || headerType === "NONE" || headerType === "TEXT") { setHeaderFile(f); return; }
    const cfg = MEDIA[headerType];
    if (f.size > cfg.maxMb * 1024 * 1024) { setError(`File exceeds ${cfg.maxMb}MB for ${headerType.toLowerCase()} headers.`); return; }
    setHeaderFile(f);
  }

  if (loading) return <div className="grid min-h-[40vh] place-items-center text-ink-3"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => nav("/whatsapp")}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <h1 className="text-[25px] font-bold tracking-tight">{isEdit ? "Edit template" : "Create template"}</h1>
      </div>

      {error && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm text-ok"><CheckCircle2 className="h-4 w-4" /> {success}</div>}

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-[440px] flex-1 space-y-5 p-5">
          {/* Basic */}
          <Section title="Template details">
            <Field label="Name" required help={isEdit ? undefined : "Lowercase, starts with a letter; letters, numbers, underscores."}>
              <input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} disabled={isEdit} className={cn(fieldCls, isEdit && "opacity-60")} placeholder="appointment_reminder" />
            </Field>
            <div className="flex gap-3">
              <Field label="Category" required>
                <select value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)} disabled={isEdit} className={cn(fieldCls, isEdit && "opacity-60")}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Language" required>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isEdit} className={cn(fieldCls, isEdit && "opacity-60")}>
                  {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Header */}
          <Section title="Header" subtitle="Optional">
            <div className="flex flex-wrap gap-1.5">
              {(["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"] as HeaderType[]).map((h) => (
                <button key={h} type="button" disabled={isEdit && h !== headerType} onClick={() => setHeaderType(h)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-semibold", headerType === h ? "border-brand bg-brand-100 text-brand" : "border-border text-ink-2 hover:bg-surface-2", isEdit && h !== headerType && "opacity-40")}>
                  {h === "NONE" ? "None" : h.charAt(0) + h.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            {isEdit && <p className="text-xs text-ink-3">Header format can't change in edit mode — Meta treats it as a different template.</p>}
            {headerType === "TEXT" && (
              <>
                <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} className={fieldCls} placeholder="Appointment Confirmation (supports one {{1}})" />
                {headerVars.length > 0 && <input value={headerExample} onChange={(e) => setHeaderExample(e.target.value)} className={fieldCls} placeholder="Sample for the header variable" />}
              </>
            )}
            {headerType !== "NONE" && headerType !== "TEXT" && (
              <>
                {existingMediaUrl ? (
                  <a href={existingMediaUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand hover:underline">Current media — open</a>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-ink-2 hover:bg-surface-2">
                    {headerFile ? headerFile.name : `Upload ${headerType.toLowerCase()} (≤${MEDIA[headerType].maxMb}MB)`}
                    <input type="file" accept={MEDIA[headerType].accept} className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </>
            )}
          </Section>

          {/* Body */}
          <Section title="Body" subtitle="Required">
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => insertVar("")} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-ink-2 hover:bg-surface-2"><Braces className="h-3.5 w-3.5" /> Add variable</button>
              {catalog.map((v: WaVariable) => (
                <button key={v.varKey} type="button" onClick={() => insertVar("", v.sample || v.label)} className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2" title={v.sample ? `e.g. ${v.sample}` : ""}>{v.label}</button>
              ))}
            </div>
            <textarea ref={bodyRef} value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={4} className={fieldCls} placeholder="Hello {{1}}, your appointment is confirmed for {{2}}." />
            <div className="text-right text-xs text-ink-3">{bodyText.length}/1024</div>
            {bodyVars.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {bodyVars.map((tok, i) => (
                  <label key={tok} className="text-xs">
                    <span className="mb-1 block font-semibold text-ink-3">Sample for {tok}</span>
                    <input value={bodyExamples[i] ?? ""} onChange={(e) => setBodyExamples((p) => { const a = [...p]; a[i] = e.target.value; return a; })} className={fieldCls} />
                  </label>
                ))}
              </div>
            )}
          </Section>

          {/* Footer */}
          <Section title="Footer" subtitle="Optional">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={footerOn} onChange={(e) => setFooterOn(e.target.checked)} /> Add a footer</label>
            {footerOn && <input value={footerText} onChange={(e) => setFooterText(e.target.value)} maxLength={60} className={fieldCls} placeholder="Reply STOP to unsubscribe" />}
          </Section>

          {/* Buttons */}
          <Section title="Buttons" subtitle="Optional">
            <div className="flex flex-wrap gap-1.5">
              {BUTTON_TYPES.map((b) => <button key={b.value} type="button" onClick={() => addButton(b.value)} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-ink-2 hover:bg-surface-2"><Plus className="h-3.5 w-3.5" /> {b.label}</button>)}
            </div>
            {buttons.map((b, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-3">{BUTTON_TYPES.find((t) => t.value === b.type)?.label}</span>
                  <button onClick={() => setButtons((arr) => arr.filter((_, j) => j !== i))} className="text-ink-3 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="flex flex-col gap-2">
                  <input value={b.text} onChange={(e) => setBtn(i, { text: e.target.value })} className={fieldCls} placeholder="Button text" />
                  {b.type === "URL" && <>
                    <input value={b.url} onChange={(e) => setBtn(i, { url: e.target.value })} className={fieldCls} placeholder="https://example.com/{{1}}" />
                    {b.url.includes("{{1}}") && <input value={b.url_example} onChange={(e) => setBtn(i, { url_example: e.target.value })} className={fieldCls} placeholder="Sample for the dynamic URL part" />}
                  </>}
                  {b.type === "PHONE_NUMBER" && <input value={b.phone_number} onChange={(e) => setBtn(i, { phone_number: e.target.value })} className={fieldCls} placeholder="+919876543210" />}
                </div>
              </div>
            ))}
          </Section>

          <div className="flex justify-end border-t border-border pt-4">
            <Button variant="primary" onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {isEdit ? "Save changes" : "Submit for approval"}</Button>
          </div>
        </Card>

        {/* Live preview */}
        <div className="w-[340px]">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold">Preview</h3>
            <div className="rounded-lg bg-surface-2 p-3">
              <div className="ml-auto max-w-[92%] rounded-lg bg-brand-100 p-2.5 text-sm text-ink shadow-sm2">
                {headerType !== "NONE" && headerType !== "TEXT" && (
                  <div className="mb-1.5 grid h-24 place-items-center rounded-md bg-surface text-xs text-ink-3">{headerType} header</div>
                )}
                {headerType === "TEXT" && headerText && <p className="mb-1 font-bold">{previewText(headerText)}</p>}
                <p className="whitespace-pre-wrap">{previewText(bodyText) || <span className="text-ink-3">Your message preview…</span>}</p>
                {footerOn && footerText && <p className="mt-1.5 text-xs text-ink-3">{footerText}</p>}
              </div>
              {buttons.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {buttons.map((b, i) => <div key={i} className="rounded-lg bg-surface py-2 text-center text-sm font-semibold text-brand shadow-sm2">{b.text || "Button"}</div>)}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-ink-3">Variables show as <code>[Variable N]</code> here; customers see the real values.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

const previewText = (t: string) => t.replace(/\{\{(\d+)\}\}/g, (_, n) => `[Variable ${n}]`);

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-bold">{title} {subtitle && <span className="ml-1 text-xs font-medium text-ink-3">{subtitle}</span>}</h3>
      {children}
    </div>
  );
}
function Field({ label, required, help, children }: { label: string; required?: boolean; help?: string; children: React.ReactNode }) {
  return (
    <label className="block flex-1">
      <span className={cn("mb-1 block text-sm font-semibold", required ? "text-ink" : "text-ink-2")}>{label}{required ? " *" : ""}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-ink-3">{help}</span>}
    </label>
  );
}
