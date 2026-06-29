import type { Column } from "@/components/DataTable";
import type { ReportConfig, ReportResult, SummaryTile } from "./types";
import { startOfDay, endOfDay, fmtMoney, fmtDate, fmtDateTime } from "./dates";
import * as A from "./api";
import { EmployeeDetailedBody } from "./bodies/EmployeeDetailedBody";
import { EmployeePerformanceBody } from "./bodies/EmployeePerformanceBody";
import { FirstVisitBody } from "./bodies/FirstVisitBody";
import { BounceBackBody } from "./bodies/BounceBackBody";
import { EodBody } from "./bodies/EodBody";
import { GstBody } from "./bodies/GstBody";

/* Loosely-typed helper so each config can declare columns against its own row. */
const def = <T,>(c: ReportConfig<T>): ReportConfig => c as unknown as ReportConfig;
const col = <T,>(header: string, cell: (r: T) => React.ReactNode, align?: "right"): Column<T> => ({ header, cell, align });

/* ───────────── Sales: detailed ───────────── */
const salesDetailed = def<A.SaleItemRow>({
  slug: "sales-detailed",
  params: [{ key: "range", label: "Date range", type: "dateRange", required: true }],
  columns: [
    col("Sale", (r) => <span className="font-mono text-xs">#{r.sale_id}</span>),
    col("Date", (r) => fmtDateTime(r.date_of_sale)),
    col("Customer", (r) => r.customer_first_name || "Walk-in"),
    col("Items", (r) => r.number_of_items, "right"),
    col("Payment", (r) => <span className="text-xs">{r.payment_types}</span>),
    col("Total", (r) => fmtMoney(r.total_cost), "right"),
  ],
  run: async (v) => {
    const r = v.range as { from: string; to: string };
    const res = await A.getSalesDetailed(r.from, r.to);
    const t = res.saleTotalsResult;
    const summary: SummaryTile[] = t ? [
      { label: "Total sales", value: fmtMoney(t.total_sales) },
      { label: "Excl. redemptions", value: fmtMoney(t.total_sales_excluding_redemptions) },
      { label: "Product sales", value: fmtMoney(t.total_product_sales) },
      { label: "Cash", value: fmtMoney(t.total_cash_sales) },
      { label: "Cards", value: fmtMoney(t.total_debit_card_sales + t.total_credit_card_sales) },
      { label: "UPI", value: fmtMoney(t.total_google_pay_sales + t.total_phonepe_sales + t.total_paytm_sales) },
      { label: "Coupons", value: fmtMoney(t.total_coupon_sales) },
      { label: "Gift cards", value: fmtMoney(t.total_gift_card_sales) },
      { label: "Family cards", value: fmtMoney(t.total_family_card_sales) },
      { label: "Male", value: String(t.total_male_customers) },
      { label: "Female", value: String(t.total_female_customers) },
    ] : [];
    return { rows: res.saleItemsResult ?? [], summary } as ReportResult<A.SaleItemRow>;
  },
});

/* ───────────── Inventory: low stock ───────────── */
const inventoryLow = def<A.LowStockRow>({
  slug: "inventory-low",
  params: [{ key: "category", label: "Category", type: "select", source: "categories", required: true, includeAll: true, allLabel: "All categories", allValue: 0 }],
  columns: [
    col("Item", (r) => r.name),
    col("Category", (r) => r.category_name),
    col("Quantity", (r) => <span className={r.quantity <= 0 ? "font-semibold text-danger" : ""}>{r.quantity}</span>, "right"),
  ],
  run: async (v) => ({ rows: await A.getLowStock(Number(v.category)) }),
});

/* ───────────── Inventory: summary ───────────── */
const inventorySummary = def<A.InvSummaryRow>({
  slug: "inventory-summary",
  params: [{ key: "category", label: "Category", type: "select", source: "categories", required: true, includeAll: true, allLabel: "All categories", allValue: 0 }],
  columns: [
    col("Item", (r) => r.name),
    col("Category", (r) => r.category_name),
    col("Quantity", (r) => r.quantity, "right"),
    col("Cost price", (r) => fmtMoney(r.cost_price), "right"),
    col("Unit price", (r) => fmtMoney(r.unit_price), "right"),
    col("Stock value", (r) => fmtMoney(r.quantity * r.cost_price), "right"),
  ],
  run: async (v) => {
    const rows = await A.getInventorySummary(Number(v.category));
    const stockValue = rows.reduce((s, r) => s + r.quantity * r.cost_price, 0);
    return { rows, summary: [{ label: "Items", value: String(rows.length) }, { label: "Total stock value", value: fmtMoney(stockValue) }] };
  },
});

/* ───────────── Inventory: receivings ───────────── */
const inventoryReceivings = def<A.ReceivingRow>({
  slug: "inventory-receivings",
  params: [
    { key: "range", label: "Date range", type: "dateRange", required: true },
    { key: "category", label: "Category", type: "select", source: "categories", required: true, includeAll: true, allLabel: "All categories", allValue: 0 },
  ],
  columns: [
    col("Item", (r) => r.itemName),
    col("Supplier", (r) => r.supplierName || "-"),
    col("Qty received", (r) => r.quantityPurchased, "right"),
    col("Cost price", (r) => fmtMoney(r.itemCostPrice), "right"),
    col("Value", (r) => fmtMoney(r.quantityPurchased * r.itemCostPrice), "right"),
  ],
  run: async (v) => {
    const r = v.range as { from: string; to: string };
    const rows = await A.getReceivings(Number(v.category), startOfDay(r.from), endOfDay(r.to));
    return { rows, summary: [{ label: "Lines", value: String(rows.length) }, { label: "Total value", value: fmtMoney(rows.reduce((s, x) => s + x.quantityPurchased * x.itemCostPrice, 0)) }] };
  },
});

/* ───────────── Inventory: receivings details ───────────── */
const receivingsDetails = def<A.ReceivingDetailRow>({
  slug: "inventory-receivings-details",
  params: [{ key: "range", label: "Date range", type: "dateRange", required: true }],
  columns: [
    col("Receiving", (r) => <span className="font-mono text-xs">#{r.receivingId}</span>),
    col("Date", (r) => fmtDateTime(r.date)),
    col("Supplier", (r) => r.suppliedBy || "-"),
    col("Received by", (r) => r.receivedBy),
    col("Items", (r) => r.itemsOrdered, "right"),
    col("Qty", (r) => r.quantityReceived, "right"),
    col("Subtotal", (r) => fmtMoney(r.subtotal), "right"),
    col("Tax", (r) => fmtMoney(r.tax), "right"),
    col("Total", (r) => fmtMoney(r.total), "right"),
    col("Payment", (r) => r.paymentType),
  ],
  run: async (v) => {
    const r = v.range as { from: string; to: string };
    const rows = await A.getReceivingsDetails(startOfDay(r.from), endOfDay(r.to));
    return { rows, summary: [{ label: "Receivings", value: String(rows.length) }, { label: "Total", value: fmtMoney(rows.reduce((s, x) => s + x.total, 0)) }] };
  },
});

/* ───────────── Inventory: detailed ───────────── */
const inventoryDetailed = def<A.DetailedInvRow>({
  slug: "inventory-detailed",
  params: [
    { key: "range", label: "Date range", type: "dateRange", required: true },
    { key: "itemId", label: "Item", type: "select", source: "items", includeAll: true, allLabel: "All items", allValue: -1, default: -1 },
    { key: "manualOnly", label: "Manual adjustments only", type: "checkbox", help: "Manual adjustments only" },
  ],
  columns: [
    col("Date", (r) => fmtDateTime(r.transDate)),
    col("Item", (r) => r.itemName),
    col("Item #", (r) => <span className="font-mono text-xs">{r.itemNumber}</span>),
    col("Category", (r) => r.categoryName),
    col("Size", (r) => r.size || "-"),
    col("Change", (r) => <span className={r.quantity < 0 ? "text-danger" : "text-ok"}>{r.quantity > 0 ? "+" : ""}{r.quantity}</span>, "right"),
    col("Comment", (r) => <span className="text-xs">{r.comment}</span>),
  ],
  run: async (v) => {
    const r = v.range as { from: string; to: string };
    const rows = await A.getDetailedInventory(startOfDay(r.from), endOfDay(r.to), Number(v.itemId ?? -1), !!v.manualOnly);
    return { rows };
  },
});

/* ───────────── Customers: retention ───────────── */
const retention = def<A.RetentionRow>({
  slug: "customers-retention",
  params: [{
    key: "timeInterval", label: "Inactive for", type: "select", required: true, default: "30_to_60_days",
    options: [
      { value: "last_30_days", label: "Last 30 days" },
      { value: "30_to_60_days", label: "30 to 60 days" },
      { value: "60_to_120_days", label: "60 to 120 days" },
      { value: "120_plus_days", label: "120+ days" },
    ],
  }],
  columns: [
    col("Customer", (r) => `${r.first_name} ${r.last_name}`.trim() || "-"),
    col("Phone", (r) => <span className="font-mono text-xs">{r.phone_number}</span>),
    col("Gender", (r) => r.gender || "-"),
    col("Visits", (r) => r.total_purchases, "right"),
    col("Total spend", (r) => fmtMoney(r.total_value_of_purchases), "right"),
    col("Avg sale", (r) => fmtMoney(r.average_sale_value), "right"),
    col("Last visit", (r) => fmtDate(r.last_visit_date)),
  ],
  run: async (v) => {
    const rows = await A.getRetention(v.timeInterval as A.RetentionInterval);
    return { rows, summary: [{ label: "Customers", value: String(rows.length) }] };
  },
});

/* ───────────── Customers: birthdays / anniversaries (legacy) ───────────── */
const customerEvents = (slug: string, event: 1 | 2): ReportConfig =>
  def<A.CustomerEventRow>({
    slug,
    params: [],
    autoRun: true,
    columns: [
      col("Customer", (r) => r.customer_name || "-"),
      col("Phone", (r) => <span className="font-mono text-xs">{r.phone_number}</span>),
      col(event === 1 ? "Birthday" : "Anniversary", (r) => (event === 1 ? r.birthday : r.anniversary) || "-"),
    ],
    run: async () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const res = await A.getCustomerEvents(event, day, month, 0);
      return { rows: res?.webReport?.summary ?? [] };
    },
  });

/* ───────────── Customers: detailed (legacy) ───────────── */
const customersDetailed = def<A.LegacyCustomerSaleRow>({
  slug: "customers-detailed",
  params: [{ key: "range", label: "Date range", type: "dateRange", required: true }],
  columns: [
    col("Sale", (r) => <span className="font-mono text-xs">#{r.sale_location_id}</span>),
    col("Date", (r) => fmtDateTime(r.sale_time)),
    col("Customer", (r) => r.customer_name || "-"),
    col("Phone", (r) => <span className="font-mono text-xs">{r.customer_phone}</span>),
    col("Gender", (r) => r.gender || "-"),
    col("Visits", (r) => r.total_visits, "right"),
    col("Type", (r) => r.customer_type || "-"),
    col("Total", (r) => fmtMoney(r.total), "right"),
  ],
  run: async (v) => {
    const r = v.range as { from: string; to: string };
    const res = await A.getCustomerSales(startOfDay(r.from), endOfDay(r.to), 0);
    return { rows: res?.webReport?.summary ?? [] };
  },
});

const REGISTRY: Record<string, ReportConfig> = {
  "sales-detailed": salesDetailed,
  "sales-gst": def({ slug: "sales-gst", params: [{ key: "my", label: "Month & year", type: "monthYear", required: true }], Body: GstBody }),
  "employees-detailed": def({ slug: "employees-detailed", params: [
    { key: "range", label: "Date range", type: "dateRange", required: true },
    { key: "employeeIds", label: "Employees", type: "multiselect", source: "employees" },
  ], Body: EmployeeDetailedBody }),
  "employees-performance": def({ slug: "employees-performance", params: [{ key: "my", label: "Month & year", type: "monthYear", required: true }], autoRun: true, Body: EmployeePerformanceBody }),
  "inventory-low": inventoryLow,
  "inventory-summary": inventorySummary,
  "inventory-receivings": inventoryReceivings,
  "inventory-receivings-details": receivingsDetails,
  "inventory-detailed": inventoryDetailed,
  "customers-detailed": customersDetailed,
  "customers-first-visit": def({ slug: "customers-first-visit", params: [{ key: "range", label: "Date range", type: "dateRange", required: true }], autoRun: true, Body: FirstVisitBody }),
  "customers-retention": retention,
  "customers-birthdays": customerEvents("customers-birthdays", 1),
  "customers-anniversaries": customerEvents("customers-anniversaries", 2),
  "coupons-bounceback": def({ slug: "coupons-bounceback", params: [{ key: "range", label: "Date range", type: "dateRange", required: true }], autoRun: true, Body: BounceBackBody }),
  "eod": def({ slug: "eod", params: [{ key: "date", label: "Report date", type: "date", required: true }], autoRun: true, Body: EodBody }),
};

export const getReportConfig = (slug?: string) => (slug ? REGISTRY[slug] : undefined);
