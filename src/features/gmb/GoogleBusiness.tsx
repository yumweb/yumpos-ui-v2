import { useState } from "react";
import { cn } from "@/lib/cn";
import { Lock, Loader2, Plug, CheckCircle2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { getFeatureAccess } from "@/lib/featureAccess";
import { isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/primitives";
import { useGmbStatus, getGmbAuthUrl, disconnectGmb, logoutGmbAccount } from "./api";
import { ReviewsTab } from "./ReviewsTab";
import { PerformanceTab } from "./PerformanceTab";
import { PostsTab } from "./PostsTab";
import { GmbMappingWizard } from "./GmbMappingWizard";

export function GoogleBusiness() {
  const configured = isApiConfigured();
  const access = getFeatureAccess("gmb");
  const admin = isAdmin();
  const [tab, setTab] = useState<"reviews" | "performance" | "posts">("reviews");
  const [busy, setBusy] = useState(false);

  const { data: status, isLoading, refetch } = useGmbStatus();

  if (!configured) {
    return <Shell><div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Connect the API to use Google Business.</div></Shell>;
  }
  if (!access.active) {
    return (
      <Shell>
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Lock className="mx-auto mb-3 h-7 w-7 text-ink-3" />
          <h2 className="text-lg font-bold">Google Business is a premium add-on</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
            {access.expired ? "Your Google Business subscription has expired." : "This feature isn’t enabled for your account."} Contact support to enable it.
          </p>
        </div>
      </Shell>
    );
  }
  if (isLoading) return <Shell><div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Loading…</div></Shell>;

  async function connect() {
    setBusy(true);
    try { const { url } = await getGmbAuthUrl(); window.location.href = url; }
    finally { setBusy(false); }
  }
  async function doDisconnect() {
    if (!confirm("Disconnect this Google Business location?")) return;
    setBusy(true);
    try { await disconnectGmb(); await refetch(); } finally { setBusy(false); }
  }
  async function doLogout() {
    if (!confirm("Sign out of the connected Google account?")) return;
    setBusy(true);
    try { await logoutGmbAccount(); await refetch(); } finally { setBusy(false); }
  }

  // Not connected → connect card
  if (!status?.connected) {
    return (
      <Shell>
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Plug className="mx-auto mb-3 h-7 w-7 text-brand" />
          <h2 className="text-lg font-bold">Connect your Google account</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">Connect the Google account that manages your business listing to sync reviews, performance and posts.</p>
          <div className="mt-5"><Button variant="primary" onClick={connect} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Connect Google</Button></div>
        </div>
      </Shell>
    );
  }

  // Connected but not mapped → mapping wizard
  if (!status.mapped) {
    return (
      <Shell connectedEmail={status.email} admin={admin} onLogout={doLogout} busy={busy}>
        <GmbMappingWizard onMapped={() => refetch()} />
      </Shell>
    );
  }

  // Connected + mapped → tabs
  return (
    <Shell connectedEmail={status.email} admin={admin} onDisconnect={doDisconnect} onLogout={doLogout} busy={busy}>
      <div className="mb-4 flex items-center gap-4 border-b border-border">
        {([["reviews", "Reviews"], ["performance", "Performance"], ["posts", "Posts & Photos"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("border-b-2 px-1 pb-2 text-sm font-semibold", tab === id ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "reviews" && <ReviewsTab />}
      {tab === "performance" && <PerformanceTab />}
      {tab === "posts" && <PostsTab />}
    </Shell>
  );
}

function Shell({ children, connectedEmail, admin, onDisconnect, onLogout, busy }: {
  children: React.ReactNode; connectedEmail?: string; admin?: boolean;
  onDisconnect?: () => void; onLogout?: () => void; busy?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Google Business</h1>
        {connectedEmail && (
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--ok-soft)] px-2.5 py-1 text-xs font-semibold text-ok">
            <CheckCircle2 className="h-3.5 w-3.5" /> {connectedEmail}
          </span>
        )}
        <div className="flex-1" />
        {admin && onDisconnect && <Button variant="default" onClick={onDisconnect} disabled={busy}>Disconnect</Button>}
        {admin && onLogout && <Button variant="default" onClick={onLogout} disabled={busy}>Sign out Google</Button>}
      </div>
      {children}
    </div>
  );
}
