/**
 * Information architecture for the workspace top-nav.
 * Built ONLY from modules that exist in the current app (yumpos-ui sidebar),
 * regrouped from a flat 27-item sidebar into a small set of grouped tabs.
 * No invented modules.
 */
import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart, CalendarDays, UserPlus,
  Users, CreditCard, Gift, TicketPercent,
  Scissors, ShoppingBag, Boxes, Truck, PackageCheck,
  MessageCircle, Megaphone, MessagesSquare, Building2, Star, LifeBuoy,
  UserCog, MapPin,
} from "lucide-react";

export interface NavLeaf {
  label: string;
  path: string;
  icon?: LucideIcon;
  /** Only shown to admin users (corporate / super-admin). */
  adminOnly?: boolean;
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
      { label: "New Sale", path: "/sales", icon: ShoppingCart },
      { label: "Appointments", path: "/appointments", icon: CalendarDays },
      { label: "Leads", path: "/leads", icon: UserPlus },
    ],
  },
  {
    id: "clients",
    label: "Customers",
    items: [
      { label: "Customers", path: "/customers", icon: Users },
      { label: "Family Cards", path: "/family-cards", icon: CreditCard },
      { label: "Gift Cards", path: "/gift-cards", icon: Gift },
      { label: "Coupons", path: "/coupons", icon: TicketPercent },
      // Promotions intentionally dropped: superseded by Engage / WhatsApp messaging.
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { label: "Services", path: "/services", icon: Scissors },
      { label: "Retail Products", path: "/retail-products", icon: ShoppingBag },
      { label: "Item Kits", path: "/item-kits", icon: Boxes },
      { label: "Suppliers", path: "/suppliers", icon: Truck },
      { label: "Receivings", path: "/receivings", icon: PackageCheck },
    ],
  },
  // Reports is a direct link; the page itself lists every report as a card by section.
  { id: "reports", label: "Reports", path: "/reports" },
  {
    id: "engage",
    label: "Engage",
    items: [
      { label: "WhatsApp", path: "/whatsapp", icon: MessageCircle },
      { label: "WA Campaigns", path: "/whatsapp/campaigns", icon: Megaphone },
      { label: "WA Chat", path: "/whatsapp/chat", icon: MessagesSquare },
      { label: "Google Business", path: "/google-business", icon: Building2 },
      { label: "Reviews", path: "/reviews", icon: Star },
      // Messages dropped.
      { label: "Tickets", path: "/tickets", icon: LifeBuoy },
    ],
  },
  {
    id: "more",
    label: "More",
    items: [
      { label: "Employees", path: "/employees", icon: UserCog },
      // Time Clock dropped: replaced by the EOD Report feature.
      // Store Config dropped: was a non-functional mockup; the real store/tax
      // config lives on the location entity, edited in Locations.
      { label: "Locations", path: "/locations", icon: MapPin, adminOnly: true },
    ],
  },
];

/** Flat list of every routable module (for the router). */
export const ALL_ROUTES: NavLeaf[] = NAV.flatMap((g) =>
  g.items ? g.items : g.path ? [{ label: g.label, path: g.path }] : []
);
