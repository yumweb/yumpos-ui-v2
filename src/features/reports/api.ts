import { api } from "@/lib/apiClient";
import { getLocation } from "@/lib/auth";

/* ─────────── Sales: detailed ─────────── */
export interface SaleItemRow {
  sale_id: number;
  date_of_sale: string;
  customer_first_name: string;
  number_of_items: number;
  total_cost: number;
  payment_types: string;
}
export interface SaleTotals {
  total_sales: number;
  total_sales_excluding_redemptions: number;
  total_product_sales: number;
  total_cash_sales: number;
  total_debit_card_sales: number;
  total_credit_card_sales: number;
  total_google_pay_sales: number;
  total_phonepe_sales: number;
  total_paytm_sales: number;
  total_family_card_sales: number;
  total_coupon_sales: number;
  total_gift_card_sales: number;
  total_deal_site_sales: number;
  total_male_customers: number;
  total_female_customers: number;
}
export const getSalesDetailed = (from: string, to: string) =>
  api.get<{ saleItemsResult: SaleItemRow[]; saleTotalsResult: SaleTotals }>(`/reports/sales/detailed?from=${from}&to=${to}`);

/* ─────────── Employees: detailed ─────────── */
export interface EmployeeTotals { grossTotalServices: number; grossTotalProducts: number; totalRedemptions: number }
export interface EmployeeReportResponse {
  sales: unknown[];
  employeeTotals: Record<string, EmployeeTotals>;
  overallGrossTotalServices: number;
  overallGrossTotalProducts: number;
  overallTotalRedemptions: number;
}
export const getEmployeeReport = (startDate: string, endDate: string, employeeIds: number[]) =>
  api.post<EmployeeReportResponse>(`/reports/employees`, { startDate, endDate, employeeIds });

/* ─────────── Employee performance ─────────── */
export interface PerformanceRow {
  employeeId: number;
  employeeName: string;
  serviceTarget: number;
  serviceMtdTarget: number;
  serviceAchieved: number;
  retailTarget: number;
  retailMtdTarget: number;
  retailAchieved: number;
}
export const getEmployeePerformance = (month: number, year: number) =>
  api.get<PerformanceRow[]>(`/reports/employee-performance?month=${month}&year=${year}`);
export const saveEmployeeTarget = (body: { employeeId: number; month: number; year: number; serviceTarget: number; retailTarget: number }) =>
  api.post(`/reports/employee-targets`, body);

/* ─────────── Inventory ─────────── */
export interface LowStockRow { name: string; quantity: number; category_name: string }
export const getLowStock = (category: number) => api.get<LowStockRow[]>(`/reports/inventory/low-stock?category=${category}`);

export interface InvSummaryRow { name: string; quantity: number; category_name: string; cost_price: number; unit_price: number }
export const getInventorySummary = (category: number) => api.get<InvSummaryRow[]>(`/reports/inventory/summary?category=${category}`);

export interface ReceivingRow { itemName: string; quantityPurchased: number; itemCostPrice: number; supplierName: string | null }
export const getReceivings = (category: number, fromDate: string, toDate: string) =>
  api.get<ReceivingRow[]>(`/reports/inventory/receivings?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&category=${category}`);

export interface ReceivingDetailRow {
  receivingId: number; date: string; itemsOrdered: number; quantityReceived: number;
  receivedBy: string; suppliedBy: string | null; subtotal: number; tax: number; total: number; paymentType: string; comments: string;
}
export const getReceivingsDetails = (from: string, to: string) =>
  api.get<ReceivingDetailRow[]>(`/reports/receivings/details?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

export interface DetailedInvRow {
  transId: number; transDate: string; itemId: number; itemName: string; itemNumber: string;
  productId: string; size: string; categoryName: string; quantity: number; comment: string; locationName: string;
}
export const getDetailedInventory = (fromDate: string, toDate: string, itemId: number, showManualAdjustmentsOnly: boolean) =>
  api.get<DetailedInvRow[]>(`/reports/inventory/detailed?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&itemId=${itemId}&showManualAdjustmentsOnly=${showManualAdjustmentsOnly}`);

/* ─────────── Customers: retention ─────────── */
export type RetentionInterval = "last_30_days" | "30_to_60_days" | "60_to_120_days" | "120_plus_days";
export interface RetentionRow {
  first_name: string; last_name: string; phone_number: string; email: string; gender: string;
  total_purchases: number; total_value_of_purchases: number; average_sale_value: number; last_visit_date: string;
}
export const getRetention = (timeInterval: RetentionInterval) =>
  api.get<RetentionRow[]>(`/reports/customer/retention?timeInterval=${timeInterval}`);

/* ─────────── First visit ─────────── */
export interface FirstVisitRow {
  customerId: number; customerName: string; customerPhone: string; firstVisitDate: string; saleId: number;
  saleTotal: number; employeeName: string; bounceBackIssued: boolean; bounceBackCouponNumber: string | null;
  bounceBackCouponStatus: "pending" | "redeemed" | "expired" | null;
}
export interface FirstVisitSummary { totalFirstVisits: number; bounceBackIssuedCount: number; bounceBackNotIssuedCount: number; issuanceRate: number }
export interface DailyCount { date: string; total: number; withBounceBack: number }
export const getFirstVisit = (from: string, to: string, page: number, limit: number) =>
  api.get<{ data: FirstVisitRow[]; total: number; page: number; limit: number; totalPages: number }>(`/reports/first-visit?from=${from}&to=${to}&page=${page}&limit=${limit}`);
export const getFirstVisitSummary = (from: string, to: string) =>
  api.get<FirstVisitSummary>(`/reports/first-visit/summary?from=${from}&to=${to}`);
export const getFirstVisitDaily = (from: string, to: string) =>
  api.get<DailyCount[]>(`/reports/first-visit/daily-counts?from=${from}&to=${to}`);

/* ─────────── Bounce-back ─────────── */
export interface BounceBackSummary { totalIssued: number; totalRedeemed: number; totalExpired: number; redemptionRate: number; totalDiscountValue: number; avgDaysToRedemption: number | null }
export interface BounceBackRow {
  id: number; couponNumber: string; customerName: string; customerPhone: string; createdAt: string;
  validityDate: string; status: "pending" | "redeemed" | "expired"; redeemedAt: string | null; daysToRedemption: number | null; value: number;
}
export const getBounceBackSummary = () => api.get<BounceBackSummary>(`/reports/bounce-back/summary`);
export const getBounceBackIssuance = (from: string, to: string, page: number, limit: number) =>
  api.get<{ data: BounceBackRow[]; total: number; page: number; limit: number; totalPages: number }>(`/reports/bounce-back/issuance?from=${from}&to=${to}&page=${page}&limit=${limit}`);
export const getBounceBackRedemption = (from: string, to: string) =>
  api.get<BounceBackRow[]>(`/reports/bounce-back/redemption?from=${from}&to=${to}`);

/* ─────────── EOD ─────────── */
export interface EodReport {
  id?: number; locationId?: number; reportDate: string; exists?: boolean;
  clientsHandled: number; todayRevenue: number; mtdRevenue: number; googleReviewsReceived: number; googlePhotosUploaded: number;
  whatsappBroadcasts: number; membershipCardsSold: number; referralContacts: number; leadsFollowupCalls: number; appointmentsNextDay: number;
  testimonialsCollected: number; membershipCardsConvinced: number; upsellingDone: number; feedbackFormsCollected: number; instagramUpdated: number;
  retentionCalls: number; staffAttendance: number; hygieneOk: number; stockChecked: number; teamBriefingDone: number; localMarketingDone: number;
  customerComplaints: number; complaintsNotes: string; suggestions: string;
}
export const getEodPrefill = (date: string) => api.get<EodReport>(`/eod-report/prefill?date=${date}`);
export const saveEodReport = (body: Partial<EodReport> & { reportDate: string }) => api.post<EodReport>(`/eod-report`, body);
export const getEodReports = (from: string, to: string) => api.get<EodReport[]>(`/eod-report?from=${from}&to=${to}`);

/* ─────────── Item options (for inventory-detailed) ─────────── */
export interface ItemOption { id: number; name: string }
export const getItemOptions = async (): Promise<ItemOption[]> => {
  const r = await api.get<{ items?: Array<{ item?: { id?: number; name?: string }; id?: number; name?: string }> }>(`/items?page=1&limit=2000`);
  return (r.items ?? []).map((x) => ({ id: (x.item?.id ?? x.id)!, name: x.item?.name ?? x.name ?? `Item ${x.item?.id ?? x.id}` })).filter((x) => x.id != null);
};

/* ─────────── Legacy production API (PHP) ─────────── *
 * A few reports have no local equivalent and read from the legacy host, exactly
 * as the existing app does. No auth header; location comes from the payload. */
const LEGACY_API = "https://api.yumpos.co/api";
async function legacy<T>(action: string, payload: Record<string, unknown>, version = "v2"): Promise<T> {
  const res = await fetch(LEGACY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Payload: payload, Header: { Object: "reports", Action: action, Version: version } }),
  });
  if (!res.ok) throw new Error(`Legacy report failed (${res.status})`);
  return res.json();
}
const locId = () => Number(getLocation()?.locationId);

/** Legacy reports wrap web rows in `webReport.summary` (+ totals in totalCustomer). */
interface LegacyWeb<T> { webReport?: { summary?: T[]; detail?: T[]; totalCustomer?: Record<string, number> } }

export interface CustomerEventRow { customer_name: string; phone_number: string; birthday?: string; anniversary?: string }
export const getCustomerEvents = (event: 1 | 2, day: string, month: string, offset = 0) =>
  legacy<LegacyWeb<CustomerEventRow>>("CustomerEvents", { locationId: [locId()], event, day, month, offset, csvExport: 0 });

export interface LegacyCustomerSaleRow {
  sale_location_id: string; sale_time: string; customer_name: string; customer_phone: string;
  gender: string; total_visits: number; customer_type: string; total: number; payment_type: string;
}
export const getCustomerSales = (from: string, to: string, offset = 0) =>
  legacy<LegacyWeb<LegacyCustomerSaleRow>>("CustomerReportDetail", { customerId: -1, locationId: [locId()], dateFrom: from, dateTo: to, csvExport: 0, offset, itemId: [0], sourceId: [0] }, "v1");

/** GST report is CSV-only on the legacy host. */
export const getGstReportCsv = (month: number, year: number) =>
  legacy<unknown>("GSTReport", { locationId: locId(), month, year });
