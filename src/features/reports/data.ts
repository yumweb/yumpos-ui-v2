import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart, Users, Boxes, TicketPercent, MoonStar,
  FileBarChart, Receipt, TrendingUp, PackageMinus, ClipboardList, PackageCheck,
  FileText, UserPlus, Repeat, Cake, Heart, Ticket,
} from "lucide-react";

export interface ReportCard {
  slug: string;
  name: string;
  desc: string;
  icon: LucideIcon;
}
export interface ReportSection {
  id: string;
  label: string;
  icon: LucideIcon;
  reports: ReportCard[];
}

/** Every report from the legacy Reports menu, grouped by section. */
export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: "sales", label: "Sales", icon: ShoppingCart,
    reports: [
      { slug: "sales-detailed", name: "Detailed Report", desc: "Itemised sales with payments, tax and technician split.", icon: FileBarChart },
      { slug: "sales-gst", name: "GST Report", desc: "Tax-wise GST summary for filing.", icon: Receipt },
    ],
  },
  {
    id: "employees", label: "Employees", icon: Users,
    reports: [
      { slug: "employees-detailed", name: "Detailed Report", desc: "Per-employee sales and service totals.", icon: FileBarChart },
      { slug: "employees-performance", name: "Employee Performance", desc: "Performance and commission by staff.", icon: TrendingUp },
    ],
  },
  {
    id: "inventory", label: "Inventory", icon: Boxes,
    reports: [
      { slug: "inventory-low", name: "Low Inventory", desc: "Items at or below their reorder level.", icon: PackageMinus },
      { slug: "inventory-summary", name: "Summary", desc: "Stock value and movement summary.", icon: ClipboardList },
      { slug: "inventory-receivings", name: "Receivings", desc: "Stock received from suppliers.", icon: PackageCheck },
      { slug: "inventory-receivings-details", name: "Receivings Details", desc: "Line-level receiving detail.", icon: FileText },
      { slug: "inventory-detailed", name: "Detailed Inventory", desc: "Full item-wise inventory snapshot.", icon: Boxes },
    ],
  },
  {
    id: "customers", label: "Customers", icon: Users,
    reports: [
      { slug: "customers-detailed", name: "Detailed Report", desc: "Customer-wise spend and visit detail.", icon: FileBarChart },
      { slug: "customers-first-visit", name: "First Visit Report", desc: "New customers and their first visit.", icon: UserPlus },
      { slug: "customers-retention", name: "Customer Retention", desc: "Repeat vs lapsed customer analysis.", icon: Repeat },
      { slug: "customers-birthdays", name: "Today's Birthdays", desc: "Customers with birthdays today.", icon: Cake },
      { slug: "customers-anniversaries", name: "Today's Anniversaries", desc: "Customers with anniversaries today.", icon: Heart },
    ],
  },
  {
    id: "coupons", label: "Coupons", icon: TicketPercent,
    reports: [
      { slug: "coupons-bounceback", name: "Bounce Back Coupon Report", desc: "New-customer bounce-back coupon usage.", icon: Ticket },
    ],
  },
  {
    id: "day-end", label: "Day End", icon: MoonStar,
    reports: [
      { slug: "eod", name: "EOD Report", desc: "End-of-day salon closing summary.", icon: FileText },
    ],
  },
];

export const findReport = (slug?: string) =>
  REPORT_SECTIONS.flatMap((s) => s.reports).find((r) => r.slug === slug);
