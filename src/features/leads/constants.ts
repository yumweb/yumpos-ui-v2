/**
 * Lead status → badge tone. Mapped to design tokens by sentiment (not the legacy
 * hardcoded hex): the pipeline reads new → warming → won/lost.
 */
import type { BadgeTone } from "@/components/ui/primitives";

export const STATUS_TONE: Record<number, BadgeTone> = {
  1: "default", // To be Validated (new / neutral)
  2: "brand",   // Prospective (in pipeline)
  3: "warn",    // Hot (urgent)
  4: "ok",      // Converted (won)
  6: "danger",  // Cold (lost / cooling)
  7: "default", // Call Not Connected (neutral)
};

export const statusTone = (statusId?: number): BadgeTone =>
  (statusId != null && STATUS_TONE[statusId]) || "default";

/** WhatsApp templates carried over from CRA src/data/promotion.js. */
export interface WhatsappTemplate {
  id: number;
  body: string;
}
export const WHATSAPP_TEMPLATES: WhatsappTemplate[] = [
  { id: 1272404983119428, body: "Hi $(variable1), Thank you for registering with us. Your ref. no is $(variable2)" },
  { id: 3969893143040412, body: "Your payment of Rs. $(variable1) is successful!" },
  { id: 315704979694901, body: "Your payment of Rs: $(variable1), for $(variable2) is successful! Congrats!" },
  { id: 313483239706552, body: "Hi $(variable1), This is the payment details for your appointment. Make sure you show the receipt at the center." },
];
