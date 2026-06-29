import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import {
  getGmbAccounts, getGmbAccountLocations, mapGmbLocation,
  type GbpAccount, type GbpLocation,
} from "./api";

const idFromName = (name: string) => name.split("/").pop() ?? name;

export function GmbMappingWizard({ onMapped }: { onMapped: () => void }) {
  const [accounts, setAccounts] = useState<GbpAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [locations, setLocations] = useState<GbpLocation[]>([]);
  const [locName, setLocName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getGmbAccounts().then(setAccounts).catch(() => setErr("Couldn’t load Google accounts."));
  }, []);

  async function pickAccount(name: string) {
    setAccountId(name); setLocName(""); setLocations([]);
    if (!name) return;
    try { setLocations(await getGmbAccountLocations(idFromName(name))); }
    catch { setErr("Couldn’t load business locations."); }
  }

  async function save() {
    const gl = locations.find((l) => l.name === locName);
    if (!accountId || !gl) { setErr("Pick an account and a business location."); return; }
    setBusy(true); setErr("");
    try {
      await mapGmbLocation({
        gbpAccountId: idFromName(accountId),
        gbpLocationId: idFromName(gl.name),
        gmapsUri: gl.metadata?.mapsUri,
        placeId: gl.metadata?.placeId,
      });
      onMapped();
    } catch { setErr("Couldn’t map the location."); setBusy(false); }
  }

  return (
    <div className="max-w-xl rounded-lg border border-border bg-surface p-6">
      <h2 className="text-lg font-bold">Link your business listing</h2>
      <p className="mt-1 text-sm text-ink-2">Choose the Google Business account and listing to connect to this store.</p>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-ink-3">Google account</span>
          <select value={accountId} onChange={(e) => pickAccount(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
            <option value="">Select account…</option>
            {accounts.map((a) => <option key={a.name} value={a.name}>{a.accountName || a.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-ink-3">Business listing</span>
          <select value={locName} onChange={(e) => setLocName(e.target.value)} disabled={!accountId} className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50">
            <option value="">Select listing…</option>
            {locations.map((l) => <option key={l.name} value={l.name}>{l.title || l.name}{l.storefrontAddress?.addressLines?.length ? ` — ${l.storefrontAddress.addressLines.join(", ")}` : ""}</option>)}
          </select>
        </label>
        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        <div><Button variant="primary" onClick={save} disabled={busy || !locName}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Link listing</Button></div>
      </div>
    </div>
  );
}
