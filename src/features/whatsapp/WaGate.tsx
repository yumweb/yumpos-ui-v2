import { Lock } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { getFeatureAccess } from "@/lib/featureAccess";

/**
 * Premium gate shared by the WhatsApp pages. Renders children only when the
 * API is configured and the WhatsApp add-on is active (corporate bypasses).
 */
export function WaGate({ children }: { children: React.ReactNode }) {
  const access = getFeatureAccess("whatsapp");

  if (!isApiConfigured()) {
    return <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Connect the API to use WhatsApp.</div>;
  }
  if (!access.active) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <Lock className="mx-auto mb-3 h-7 w-7 text-ink-3" />
        <h2 className="text-lg font-bold">WhatsApp Business is a premium add-on</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
          {access.expired
            ? `Your WhatsApp subscription has expired${access.expiry ? ` on ${new Date(access.expiry).toLocaleDateString("en-IN")}` : ""}.`
            : "This feature isn’t enabled for your account."}{" "}
          Contact your administrator to enable it.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
