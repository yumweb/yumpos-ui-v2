/**
 * Premium add-on access (WhatsApp / GMB), mirrored from the platform subscription
 * gate. A feature is "active" when the location's enabled flag is on AND its
 * expiry is in the future — OR the user is corporate (corporate bypasses gates).
 *
 * userInfo (localStorage `yumpos_user_info`, set at /auth/set-location) carries:
 * isWhatsappEnabled, whatsappExpiry, isGmbEnabled, gmbExpiry, isCorporate.
 */
import { getUser } from "./auth";

export type FeatureKey = "whatsapp" | "gmb";

const FEATURES: Record<FeatureKey, { enabledKey: string; expiryKey: string }> = {
  whatsapp: { enabledKey: "isWhatsappEnabled", expiryKey: "whatsappExpiry" },
  gmb: { enabledKey: "isGmbEnabled", expiryKey: "gmbExpiry" },
};

export interface FeatureAccess {
  enabled: boolean;
  expiry: string | null;
  active: boolean;
  expired: boolean;
  isCorporate: boolean;
}

export function getFeatureAccess(feature: FeatureKey): FeatureAccess {
  const u = (getUser<Record<string, unknown>>() ?? {}) as Record<string, unknown>;
  const cfg = FEATURES[feature];
  const enabled = Boolean(u[cfg.enabledKey]);
  const expiry = (u[cfg.expiryKey] as string) || null;
  const isCorporate = Boolean(u.isCorporate);

  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const notExpired = !!expiry && new Date(expiry) >= startOfToday;

  const active = isCorporate || (enabled && notExpired);
  const expired = enabled && !notExpired && !isCorporate;
  return { enabled, expiry, active, expired, isCorporate };
}
