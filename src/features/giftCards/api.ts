import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

// Customer autocomplete is identical to family cards — reuse it.
export { useCustomerSearch, type CustomerHit } from "@/features/familyCards/api";

export interface GiftCardPerson {
  id?: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}
/** GET /giftcards row shape (verified against the live API). */
export interface GiftCard {
  id: number;
  giftcardNumber: string;
  description?: string;
  value?: string;
  inactive?: boolean;
  deleted?: boolean;
  customerId?: number;
  locationId?: number;
  person?: GiftCardPerson;
  [k: string]: unknown;
}

interface GiftCardListResponse {
  giftcards: GiftCard[];
  count: number;
}

export function useGiftCards(page: number, limit: number, number: string) {
  return useQuery({
    queryKey: ["gift-cards", page, limit, number],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const filters = number ? `&number=${encodeURIComponent(number)}` : "";
      return api.get<GiftCardListResponse>(`/giftcards?page=${page}&limit=${limit}${filters}`);
    },
  });
}

/* ---- Update gift card (PATCH /giftcards/:id) ---- */
export interface GiftCardUpdateInput {
  giftcardNumber: string;
  description: string;
  value: number;          // @IsNumber() — must be a real number (no transform on the API)
  customerId?: number;
}
export function useUpdateGiftCard() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: GiftCardUpdateInput }) =>
      api.patch(`/giftcards/${id}`, {
        giftcardNumber: input.giftcardNumber.trim(),
        description: input.description.trim(),
        value: input.value,
        ...(input.customerId ? { customerId: input.customerId } : {}),
      }),
  });
}

export const gcCustomerName = (c: GiftCard) =>
  [c.person?.firstName, c.person?.lastName].filter(Boolean).join(" ").trim() || "NA";
