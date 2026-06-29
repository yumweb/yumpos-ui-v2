import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ChevronDown, Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { isApiConfigured } from "@/lib/apiClient";
import { getLocation, setSession, type StoredLocation } from "@/lib/auth";
import { getUserLocations, setUserLocation } from "@/features/auth/api";

const label = (l?: StoredLocation | null) =>
  l ? (l.locationName ?? l.name ?? `Location ${l.locationId}`) : "Location";

export function LocationSwitcher() {
  const current = getLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [switching, setSwitching] = useState<number | string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["user-locations-switcher"],
    enabled: isApiConfigured() && open,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => (await getUserLocations()).locations ?? [],
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = data ?? [];
    return n ? list.filter((l) => label(l).toLowerCase().includes(n)) : list;
  }, [data, q]);

  async function choose(loc: StoredLocation) {
    if (String(loc.locationId) === String(current?.locationId)) { setOpen(false); return; }
    setSwitching(loc.locationId);
    try {
      const res = await setUserLocation(loc.locationId);
      if (!res.token) throw new Error("no token");
      setSession(res.token, loc, res.userInfo);
      // Reload so every query refetches under the new location-scoped token.
      window.location.href = "/home";
    } catch {
      setSwitching(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2"
      >
        <MapPin className="h-4 w-4 text-brand" />
        <span className="max-w-[180px] truncate">{label(current)}</span>
        <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-80 overflow-hidden rounded-md border border-border bg-surface shadow-soft">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search locations…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3" />
          </div>
          <div className="max-h-80 overflow-auto p-1">
            {isLoading ? (
              <div className="px-3 py-6 text-center text-sm text-ink-3">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-ink-3">No locations found.</div>
            ) : (
              filtered.map((loc) => {
                const active = String(loc.locationId) === String(current?.locationId);
                return (
                  <button key={String(loc.locationId)} onClick={() => choose(loc)} disabled={switching != null}
                    className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2",
                      active ? "font-semibold text-brand" : "text-ink-2")}>
                    <MapPin className="h-4 w-4 shrink-0 text-ink-3" />
                    <span className="flex-1 truncate">{label(loc)}</span>
                    {switching === loc.locationId ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <Check className="h-4 w-4 text-brand" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
