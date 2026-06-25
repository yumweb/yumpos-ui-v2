import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

// Customer autocomplete (search by phone/name) is identical to family cards.
export { useCustomerSearch, type CustomerHit } from "@/features/familyCards/api";

export interface CouponLog {
  logDate?: string;
  logMessage?: string;
}
export interface CouponPerson {
  id?: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}
/** GET /coupons row shape (verified against the live API). */
export interface Coupon {
  id: number;
  couponNumber: string;
  description?: string;
  couponOption?: "percentage" | "pricevalue" | string;
  couponType?: "manual" | "referral" | "bounce_back" | string;
  value?: number | string;
  startDate?: string;
  validityDate?: string;
  inactive?: boolean;
  onetime?: boolean;
  deleted?: boolean;
  customerId?: number;
  minBillValue?: number | null;
  person?: CouponPerson;
  couponLogs?: CouponLog[];
  [k: string]: unknown;
}

interface CouponListResponse {
  coupons: Coupon[];
  count: number;
}

/** Always include redeemed (deleted) coupons, like CRA. */
export function useCoupons(page: number, limit: number, number: string) {
  return useQuery({
    queryKey: ["coupons", page, limit, number],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const filters = number ? `&number=${encodeURIComponent(number)}` : "";
      return api.get<CouponListResponse>(`/coupons?page=${page}&limit=${limit}${filters}&includeDeleted=true`);
    },
  });
}

/** Fetch all coupons for the CSV export. */
export function fetchAllCoupons() {
  return api.get<CouponListResponse>(`/coupons?page=1&limit=10000&includeDeleted=true`);
}

/* ---- Create coupon (POST /coupons) ---- */
export interface NewCouponInput {
  couponNumber: string;
  description: string;             // type label (Voucher, Gift-certificate, …)
  couponOption: "percentage" | "pricevalue";
  value: string;                   // @IsDecimal on the API — send as a string
  startDate: string;               // YYYY-MM-DD
  validityDate: string;            // YYYY-MM-DD
  onetime: boolean;
  customerId?: number;
  minBillValue?: string;
}
export function useCreateCoupon() {
  return useMutation({
    mutationFn: (input: NewCouponInput) => {
      const payload: Record<string, unknown> = {
        couponNumber: input.couponNumber.trim(),
        description: input.description,
        couponOption: input.couponOption,
        value: input.value.trim(),
        startDate: input.startDate,
        validityDate: input.validityDate,
        onetime: input.onetime,
      };
      if (input.customerId) payload.customerId = input.customerId;
      if (input.minBillValue?.trim()) payload.minBillValue = parseFloat(input.minBillValue);
      return api.post<{ id?: number; statusCode?: number }>(`/coupons`, payload);
    },
  });
}

/* ---- Display helpers ---- */
export const COUPON_TYPE_LABEL: Record<string, string> = {
  manual: "Manual",
  referral: "Referral",
  bounce_back: "Bounce Back",
};
export const couponValueLabel = (c: Coupon) =>
  c.couponOption === "percentage" ? `${c.value}%` : `₹${c.value}`;
export const couponDiscountType = (c: Coupon) =>
  c.couponOption === "percentage" ? "Percent Discount" : "Price Value";
export const couponStatus = (c: Coupon): { label: string; tone: "ok" | "default" | "brand" } =>
  c.deleted ? { label: "Redeemed", tone: "brand" }
    : c.inactive ? { label: "Inactive", tone: "default" }
      : { label: "Active", tone: "ok" };
export const couponCustomerName = (c: Coupon) =>
  [c.person?.firstName, c.person?.lastName].filter(Boolean).join(" ").trim() || "—";

/** Coupon-type labels offered in the create form (carried from CRA). */
export const COUPON_DESCRIPTIONS = ["Bounce Back Coupon", "Gift-certificate", "Voucher", "Family saver-kit"];
