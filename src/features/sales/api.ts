import { useQuery, useMutation } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** Normalized item used by the POS. */
export interface PosItem {
  id: number | string;
  name: string;
  price: number;
  category: string;
  categoryParentId?: number | string;
  isService: boolean;
  taxIncluded: boolean;
  stock: number;
}

interface RawLocationItem {
  itemId?: number | string;
  unitPrice?: number | string | null;
  promoPrice?: number | string | null;
  quantity?: number | string | null;
  item?: {
    itemId?: number | string;
    name?: string;
    isService?: boolean;
    taxIncluded?: boolean;
    unitPrice?: number | string | null;
    promoPrice?: number | string | null;
    category?: { name?: string; parentId?: number | string } | null;
  };
}

function normalize(r: RawLocationItem): PosItem {
  const it = r.item ?? {};
  const price =
    [r.promoPrice, r.unitPrice, it.promoPrice, it.unitPrice]
      .map((v) => Number(v))
      .find((n) => Number.isFinite(n) && n > 0) ?? 0;
  return {
    id: (r.itemId ?? it.itemId)!,
    name: it.name ?? "Item",
    price,
    category: it.category?.name ?? "",
    categoryParentId: it.category?.parentId ?? undefined,
    isService: Boolean(it.isService),
    taxIncluded: Boolean(it.taxIncluded),
    stock: Number(r.quantity ?? 0) || 0,
  };
}

/** GET /items/search?keyword= → flat array, normalized to PosItem. */
export function useItemSearch(keyword: string) {
  return useQuery({
    queryKey: ["item-search", keyword],
    enabled: isApiConfigured() && keyword.trim().length > 0,
    queryFn: async () => {
      const rows = await api.get<RawLocationItem[]>(
        `/items/search?keyword=${encodeURIComponent(keyword.trim())}`
      );
      return (Array.isArray(rows) ? rows : []).map(normalize);
    },
  });
}

/* ---- Packages (item kits) — Phase 4 ---- */

/** A package search result (GET /itemkits?name=). */
export interface KitLite {
  itemKitId: number;
  name: string;
  price: number;
  taxIncluded: boolean;
}

/** One included service of a package, configurable for redeem-at-sale. */
export interface KitServiceLine {
  itemId: number;
  name: string;
  isService: boolean;
  quantity: number;
  itemTaxes: { name: string; percent: number }[];
  redeemed: boolean;
  technicianId: number | string | null;
}

/** A fully-loaded package added to the cart. */
export interface PackageLine {
  itemKitId: number;
  name: string;
  unitPrice: number;
  costPrice: number;
  taxIncluded: boolean;
  services: KitServiceLine[];
}

/** GET /itemkits?name= → package search results for the register. */
export function useKitSearch(keyword: string) {
  return useQuery({
    queryKey: ["kit-search", keyword],
    enabled: isApiConfigured() && keyword.trim().length > 0,
    queryFn: async () => {
      const res = await api.get<{ itemkits?: RawKit[] } | RawKit[]>(
        `/itemkits?page=1&limit=20&name=${encodeURIComponent(keyword.trim())}`
      );
      const rows = Array.isArray(res) ? res : res.itemkits ?? [];
      return rows
        .map((r): KitLite => ({
          itemKitId: Number(r.itemKitId ?? r.itemkit?.itemKitId),
          name: r.itemkit?.name ?? "Package",
          price: Number(r.unitPrice ?? r.itemkit?.unitPrice ?? 0) || 0,
          taxIncluded: Boolean(r.itemkit?.taxIncluded ?? r.taxIncluded),
        }))
        .filter((k) => Number.isFinite(k.itemKitId) && k.itemKitId > 0);
    },
  });
}

interface RawKit {
  itemKitId?: number | string;
  name?: string;
  unitPrice?: number | string | null;
  costPrice?: number | string | null;
  taxIncluded?: boolean;
  itemkit?: {
    itemKitId?: number | string;
    name?: string;
    taxIncluded?: boolean;
    unitPrice?: number | string | null;
    costPrice?: number | string | null;
    itemkitItems?: RawKitItem[];
  };
  itemkitItems?: RawKitItem[];
}
interface RawKitItem {
  itemId?: number | string;
  quantity?: number | string | null;
  item?: { itemId?: number | string; name?: string; isService?: boolean; itemTaxes?: { name?: string; percent?: number | string }[] };
}

/** GET /itemkits/:id → the package with its included services (for the config modal). */
export async function fetchPackage(itemKitId: number): Promise<PackageLine> {
  const r = await api.get<RawKit>(`/itemkits/${itemKitId}`);
  const kit = r.itemkit ?? r;
  const rawItems = kit.itemkitItems ?? r.itemkitItems ?? [];
  const services: KitServiceLine[] = rawItems.map((ki) => {
    const it = ki.item ?? {};
    return {
      itemId: Number(ki.itemId ?? it.itemId),
      name: it.name ?? "Service",
      isService: Boolean(it.isService),
      quantity: Number(ki.quantity ?? 1) || 1,
      itemTaxes: (it.itemTaxes ?? []).map((t) => ({ name: t.name ?? "", percent: Number(t.percent) || 0 })),
      redeemed: false,
      technicianId: null,
    };
  });
  return {
    itemKitId: Number(r.itemKitId ?? kit.itemKitId ?? itemKitId),
    name: kit.name ?? "Package",
    unitPrice: Number(r.unitPrice ?? kit.unitPrice ?? 0) || 0,
    costPrice: Number(r.costPrice ?? kit.costPrice ?? 0) || 0,
    taxIncluded: Boolean(kit.taxIncluded),
    services,
  };
}

interface CategoryName {
  id: number | string;
  name: string;
}

/** GET /categories/names → id→name map (resolve a category's parent label). */
export function useCategoryNames() {
  return useQuery({
    queryKey: ["category-names"],
    enabled: isApiConfigured(),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get<CategoryName[] | { categories?: CategoryName[] }>("/categories/names");
      const arr = Array.isArray(res) ? res : res.categories ?? [];
      const map = new Map<string, string>();
      arr.forEach((c) => map.set(String(c.id), c.name));
      return map;
    },
  });
}

/* ---- Location: technicians + tax config (GET /locations/:id) ---- */

export interface Technician {
  id: number | string;
  name: string;
}
export interface TaxConfig {
  name1: string;
  rate1: number;
  name2: string;
  rate2: number;
}

interface RawLocation {
  employeeConnection?: Array<{
    person?: { id?: number | string; firstName?: string; lastName?: string };
    employee?: {
      id?: number | string;
      personId?: number | string;
      deleted?: boolean;
      isCorporate?: boolean;
      isOwner?: boolean;
      person?: { id?: number | string; firstName?: string; lastName?: string };
    };
  }>;
  taxRates?: Array<{ name?: string; rate?: number | string }>;
  default_tax_1_rate?: number | string;
  default_tax_1_name?: string;
  default_tax_2_rate?: number | string;
  default_tax_2_name?: string;
  [k: string]: unknown;
}

export function useLocation(locationId: number | string) {
  return useQuery({
    queryKey: ["location", locationId],
    enabled: isApiConfigured() && locationId != null,
    staleTime: 30 * 60 * 1000,
    queryFn: () => api.get<RawLocation>(`/locations/${locationId}`),
  });
}

export function parseTechnicians(loc?: RawLocation): Technician[] {
  const conn = loc?.employeeConnection ?? [];
  return conn
    .filter((c) => c.employee && c.employee.deleted === false && c.employee.isCorporate === false && c.employee.isOwner === false)
    .map((c) => {
      const p = c.person ?? c.employee?.person;
      return {
        id: (p?.id ?? c.employee?.personId ?? c.employee?.id)!,
        name: [p?.firstName, p?.lastName].filter(Boolean).join(" ") || "Staff",
      };
    });
}

/** Mirrors taxCalculations.getTaxConfiguration (Studio11 default 9% + 9%). */
export function parseTaxConfig(loc?: RawLocation): TaxConfig {
  let rates: Array<{ name?: string; rate?: number | string }> | null = null;
  if (Array.isArray(loc)) rates = loc;
  else if (loc?.taxRates) rates = loc.taxRates;
  else if (loc?.default_tax_1_rate != null)
    rates = [
      { name: loc.default_tax_1_name || "CGST", rate: loc.default_tax_1_rate },
      { name: loc.default_tax_2_name || "SGST", rate: loc.default_tax_2_rate },
    ];
  const r1 = rates?.[0] ? Number(rates[0].rate) : NaN;
  const r2 = rates?.[1] ? Number(rates[1].rate) : NaN;
  if (!Number.isFinite(r1) || !Number.isFinite(r2)) {
    return { name1: "CGST", rate1: 9, name2: "SGST", rate2: 9 };
  }
  return { name1: rates![0].name || "CGST", rate1: r1, name2: rates![1].name || "SGST", rate2: r2 };
}

/** A gift/family card being SOLD on this sale (Phase 4). */
export interface SpecialCard {
  kind: "giftCard" | "familyCard";
  number: string;
  value: number; // card credit/stored value
  price: number; // amount charged to the customer (presets can credit > price)
  validityDate?: string; // family card only (ISO)
}

/** Catalog item ids for the card charge lines (mirrors the legacy register). */
export const GIFT_CARD_ITEM_ID = 2944;
export const FAMILY_CARD_ITEM_ID = 2909;

export interface CartLine {
  item: PosItem;
  qty: number;
  technicianId: number | string | null;
  /** Per-line discount %, 0-100 (services only, mirroring the register). */
  discountPercent: number;
  /** Set when this line is a gift/family card being sold. */
  special?: SpecialCard;
  /** Set when this line is a package (item kit) being sold. */
  pkg?: PackageLine;
}

export interface Bill {
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  taxTotal: number;
  total: number;
}

/**
 * Per-line tax (inclusive vs exclusive) with CGST/SGST split, plus discounts:
 * each line's `discountPercent`, and an optional whole-sale fixed ₹ discount
 * applied pre-tax (the legacy "Discount Entire Sale" line item).
 */
export function computeBill(lines: CartLine[], tax: TaxConfig, entireSaleDiscount = 0): Bill {
  const rate = tax.rate1 + tax.rate2;
  let subtotal = 0;
  let discount = 0;
  let cgst = 0;
  let sgst = 0;
  const splitTax = (lineTax: number) => {
    if (rate > 0) { cgst += (lineTax * tax.rate1) / rate; sgst += (lineTax * tax.rate2) / rate; }
  };
  for (const l of lines) {
    const grossFull = l.item.price * l.qty;
    const gross = grossFull * (1 - (l.discountPercent || 0) / 100);
    const base = l.item.taxIncluded && rate > 0 ? gross / (1 + rate / 100) : gross;
    const baseFull = l.item.taxIncluded && rate > 0 ? grossFull / (1 + rate / 100) : grossFull;
    const lineTax = l.item.taxIncluded ? gross - base : (base * rate) / 100;
    subtotal += base;
    discount += baseFull - base;
    splitTax(lineTax);
  }
  // whole-sale fixed discount (pre-tax service reduction), capped at the subtotal
  if (entireSaleDiscount > 0) {
    const d = Math.min(entireSaleDiscount, subtotal);
    subtotal -= d;
    discount += d;
    const dTax = (d * rate) / 100;
    if (rate > 0) { cgst -= (dTax * tax.rate1) / rate; sgst -= (dTax * tax.rate2) / rate; }
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  subtotal = r2(subtotal);
  discount = r2(discount);
  cgst = r2(Math.max(0, cgst));
  sgst = r2(Math.max(0, sgst));
  const taxTotal = r2(cgst + sgst);
  return { subtotal, discount, cgst, sgst, taxTotal, total: r2(subtotal + taxTotal) };
}

/** Public receipt/print app (yumpos-url-shortener on b.studio11.co). */
const RECEIPT_BASE = (import.meta.env.VITE_RECEIPT_URL ?? "https://b.studio11.co").replace(/\/$/, "");
export const receiptUrl = (locationId: number | string, saleId: number | string) =>
  `${RECEIPT_BASE}/print/${locationId}/${saleId}`;

/* ---- Customer ---- */

export interface CustomerLite {
  id?: number | string;
  personId?: number | string;
  person?: { id?: number | string; firstName?: string; lastName?: string; phoneNumber?: string };
  points?: number | string;
  loyaltyCardNumber?: string | null;
  loyaltyCardDiscount?: number | string | null;
  saleCount?: number | string;
  lifetimeValue?: number | string;
  birthday?: string | null;
  anniversary?: string | null;
  [k: string]: unknown;
}

export function useCustomerByPhone(phone: string) {
  return useQuery({
    queryKey: ["customer-phone", phone],
    enabled: isApiConfigured() && phone.replace(/\D/g, "").length >= 10,
    retry: false,
    queryFn: () => api.get<CustomerLite>(`/customers/search/?phone=${encodeURIComponent(phone)}`),
  });
}

export const customerName = (c?: CustomerLite | null) =>
  c ? [c.person?.firstName, c.person?.lastName].filter(Boolean).join(" ") : "";
export const customerId = (c?: CustomerLite | null) => c?.person?.id ?? c?.personId ?? c?.id ?? null;

/* ---- Create / suspend sale (POST /sales) ---- */

export function useCreateSale() {
  return useMutation({
    mutationFn: (payload: unknown) => api.post<{ id: number | string; stockWarnings?: unknown[] }>(`/sales`, payload),
  });
}

/* ---- Redemption instruments (gift card / family card / coupon) ---- *
 * Phase 3: looked up + validated before adding as a payment, then redeemed
 * post-sale (the sale's payments[] carries no card number, so the deduction
 * must reference the created saleId). */

export interface GiftCardLite { id: number; giftcardNumber: string; value: number; customerId?: number; inactive?: boolean; deleted?: boolean; person?: { id?: number } }
export interface FamilyCardLite { id: number; familycardNumber: string; value: number; balance?: number; validityDate?: string; inactive?: boolean; deleted?: boolean; customerId?: number; person?: { id?: number } }
export interface CouponValidation {
  valid: boolean;
  error?: string;
  coupon?: { id: number; couponNumber: string; value: number; couponOption: "percentage" | "price"; description?: string };
  requiresCustomer?: boolean;
  minBillValue?: number;
  currentBillTotal?: number;
}

export const lookupGiftCard = async (number: string): Promise<GiftCardLite | null> => {
  const r = await api.get<{ giftcards?: GiftCardLite[] } | GiftCardLite[]>(`/giftcards?page=1&limit=1&number=${encodeURIComponent(number)}`);
  const list = Array.isArray(r) ? r : r.giftcards ?? [];
  return list[0] ?? null;
};
export const lookupFamilyCard = async (number: string): Promise<FamilyCardLite | null> => {
  const r = await api.get<{ familycards?: FamilyCardLite[] } | FamilyCardLite[]>(`/familycards?page=1&limit=1&number=${encodeURIComponent(number)}`);
  const list = Array.isArray(r) ? r : r.familycards ?? [];
  return list[0] ?? null;
};
export const validateCoupon = (code: string, customerId: number | string, billTotal: number) =>
  api.get<CouponValidation>(`/coupons/validate/${encodeURIComponent(code)}?customerId=${customerId}&billTotal=${billTotal}`);

export const redeemGiftCard = (id: number, body: { giftcardNumber: string; redeemValue: number; saleId: string }) =>
  api.patch(`/giftcards/${id}/redeem`, body);
export const redeemFamilyCard = (id: number, body: { familyCardNumber: string; redeemValue: number; saleId: string }) =>
  api.patch(`/familycards/${id}/redeem`, body);
export const redeemCoupon = (id: number, body: { couponNumber: string; redeemValue: number; customerId: number | string; billTotal: number }) =>
  api.patch(`/coupons/${id}/redeem`, body);

/* ---- Create customer (POST /customers, flat payload) ---- */

export interface NewCustomerInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber: string;
  gender: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  comments?: string;
  // Birthdays & Anniversary
  birthday?: string;
  anniversary?: string;
  // Loyalty Management
  loyaltyCardNumber?: string;
  loyaltyCardDiscount?: string;
  currentSpendForPoints?: string;
  points?: string;
  // Company and Tax Settings
  companyAddress?: string;
  sourceId?: string;
  dndSms?: boolean;
  dndEmail?: boolean;
}

interface CreatedCustomer {
  id?: number | string;
  personId?: number | string;
  person?: { id?: number | string };
}

function personPayload(input: NewCustomerInput) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName?.trim() ?? "",
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    phoneNumber: input.phoneNumber.trim(),
    address1: input.address1?.trim() ?? "",
    address2: input.address2?.trim() ?? "",
    city: input.city?.trim() ?? "",
    state: input.state?.trim() ?? "",
    zip: input.zip?.trim() ?? "",
    country: input.country?.trim() ?? "",
    comments: input.comments?.trim() ?? "",
  };
}

/**
 * Shared loyalty/lead/dnd fields. The API runs ValidationPipe without `transform`,
 * so @IsNumber() fields must be real numbers — coerce here, never send strings.
 */
function commonPayload(input: NewCustomerInput) {
  const discount = Number(input.loyaltyCardDiscount);
  return {
    gender: input.gender,
    birthday: input.birthday || null,
    anniversary: input.anniversary || null,
    points: Number(input.points) || 0,
    currentSpendForPoints: Number(input.currentSpendForPoints) || 0,
    sourceId: Number(input.sourceId),
    dndSms: Boolean(input.dndSms),
    dndEmail: Boolean(input.dndEmail),
    ...(input.loyaltyCardNumber?.trim() ? { loyaltyCardNumber: input.loyaltyCardNumber.trim() } : {}),
    ...(Number.isFinite(discount) && discount > 0 ? { loyaltyCardDiscount: discount } : {}),
  };
}

/** PATCH /customers/:id — update payload nests person (per CRA updateData). */
export function useUpdateCustomer() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number | string; input: NewCustomerInput }) =>
      api.patch<CreatedCustomer>(`/customers/${id}`, {
        person: personPayload(input),
        ...commonPayload(input),
      }),
  });
}

export function useCreateCustomer() {
  return useMutation({
    mutationFn: (input: NewCustomerInput) => {
      const payload = {
        ...personPayload(input),
        ...commonPayload(input),
        // companyAddress is on the create DTO only (not update / not the entity).
        companyAddress: input.companyAddress?.trim() ?? "",
      };
      return api.post<CreatedCustomer>("/customers", payload);
    },
  });
}
