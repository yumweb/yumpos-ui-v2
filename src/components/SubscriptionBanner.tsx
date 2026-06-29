import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useSubscription } from "@/features/home/api";

/**
 * App-wide subscription warning. Only renders the at-risk states (carried from
 * the legacy Dashboard logic): expired (red) or expiring within 30 days (amber).
 * The healthy "valid until" state is shown in the profile menu, not here.
 */
export function SubscriptionBanner() {
  const sub = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (!sub.expired && !sub.expiringSoon)) return null;

  const expired = sub.expired;
  return (
    <div className={`flex items-center gap-2 px-6 py-2 text-sm font-medium ${expired ? "bg-[var(--danger-soft)] text-danger" : "bg-[var(--warn-soft)] text-warn"}`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {expired
          ? `Your subscription expired on ${sub.formatted}. Please renew it to avoid service interruption.`
          : `Your subscription will expire on ${sub.formatted}${sub.daysLeft != null ? ` (in ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"})` : ""}. Please renew it soon.`}
      </span>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
    </div>
  );
}
