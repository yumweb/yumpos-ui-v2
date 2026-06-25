/**
 * Information architecture for the workspace top-nav.
 * Built ONLY from modules that exist in the current app (yumpos-ui sidebar),
 * regrouped from a flat 27-item sidebar into a small set of grouped tabs.
 * No invented modules.
 */
export interface NavLeaf {
  label: string;
  path: string;
}
export interface NavGroup {
  id: string;
  label: string;
  /** Direct destination (Home); groups with `items` open a menu instead. */
  path?: string;
  items?: NavLeaf[];
}

export const NAV: NavGroup[] = [
  { id: "home", label: "Home", path: "/home" },
  {
    id: "sell",
    label: "Sell",
    items: [
      { label: "New Sale", path: "/sales" },
      { label: "Appointments", path: "/appointments" },
      { label: "Leads", path: "/leads" },
    ],
  },
  {
    id: "clients",
    label: "Customers",
    items: [
      { label: "Customers", path: "/customers" },
      { label: "Family Cards", path: "/family-cards" },
      { label: "Gift Cards", path: "/gift-cards" },
      { label: "Coupons", path: "/coupons" },
      { label: "Promotions", path: "/promotions" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { label: "Services", path: "/services" },
      { label: "Retail Products", path: "/retail-products" },
      { label: "Item Kits", path: "/item-kits" },
      { label: "Suppliers", path: "/suppliers" },
      { label: "Receivings", path: "/receivings" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    items: [
      { label: "Reports", path: "/reports" },
      { label: "Customer Retention", path: "/reports/retention" },
      { label: "EOD Report", path: "/eod-report" },
    ],
  },
  {
    id: "engage",
    label: "Engage",
    items: [
      { label: "WhatsApp", path: "/whatsapp" },
      { label: "WA Campaigns", path: "/whatsapp/campaigns" },
      { label: "WA Chat", path: "/whatsapp/chat" },
      { label: "Google Business", path: "/google-business" },
      { label: "Reviews", path: "/reviews" },
      { label: "Messages", path: "/messages" },
      { label: "Tickets", path: "/tickets" },
    ],
  },
  {
    id: "more",
    label: "More",
    items: [
      { label: "Employees", path: "/employees" },
      { label: "Time Clock", path: "/time-clock" },
      { label: "Store Config", path: "/settings/store" },
      { label: "Locations", path: "/settings/locations" },
    ],
  },
];

/** Flat list of every routable module (for the router). */
export const ALL_ROUTES: NavLeaf[] = NAV.flatMap((g) =>
  g.items ? g.items : g.path ? [{ label: g.label, path: g.path }] : []
);
