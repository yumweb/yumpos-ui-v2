import logoStudio11 from "@/assets/brand/logo-studio11.png";

/**
 * Tenant configuration. A tenant is a CONFIG object, not a code copy.
 * Branding lives in tokens.css (data-brand); everything brand-specific that
 * isn't a color lives here. Adding Isa Spa later = one more entry, not a fork.
 */
export type TenantId = "studio11";

export interface TenantConfig {
  id: TenantId;
  name: string;
  logo: string;
  /** Feature flags — turn modules on/off per tenant without branching code. */
  features: {
    membership: boolean;
    whatsapp: boolean;
    googleBusiness: boolean;
  };
}

export const TENANTS: Record<TenantId, TenantConfig> = {
  studio11: {
    id: "studio11",
    name: "Studio11",
    logo: logoStudio11,
    features: { membership: true, whatsapp: true, googleBusiness: true },
  },
};

/** Resolve the active tenant. Today: Studio11. Later: by hostname / env. */
export const ACTIVE_TENANT: TenantId = "studio11";
export const tenant = TENANTS[ACTIVE_TENANT];
