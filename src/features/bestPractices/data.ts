import { lazy, type LazyExoticComponent, type ComponentType } from "react";

/** A best-practice / SOP document. Content is static, lazy-loaded per id. */
export interface SopDoc {
  id: string;
  title: string;
  category: string;
  description: string;
}

export const SOP_DOCS: SopDoc[] = [
  { id: "client-interaction-sop", title: "Client Interaction SOP", category: "Customer Service", description: "Standard operating procedures for client interactions" },
  { id: "customer-care-protocol", title: "Customer Care Protocol", category: "Customer Service", description: "Guidelines for customer care and support" },
  { id: "daily-checklists", title: "Daily Checklists", category: "Operations", description: "Daily operational checklists for staff" },
  { id: "discounting-guidelines", title: "Discounting Guidelines", category: "Sales", description: "Rules and procedures for applying discounts" },
  { id: "email-etiquettes", title: "Email Etiquettes", category: "Communication", description: "Best practices for email communication" },
  { id: "house-rules", title: "House Rules", category: "Operations", description: "General salon rules and policies" },
  { id: "sanitization-and-sterilization", title: "Sanitization & Sterilization", category: "Hygiene", description: "Hygiene and safety protocols" },
  { id: "tele-calling-guidelines", title: "Tele-calling Guidelines", category: "Communication", description: "Guidelines for phone outreach calls" },
  { id: "telephone-etiquettes", title: "Telephone Etiquettes", category: "Communication", description: "Best practices for phone communication" },
];

export const findSopDoc = (id?: string) => SOP_DOCS.find((d) => d.id === id);

/** Lazy content components, keyed by doc id. */
export const SOP_CONTENT: Record<string, LazyExoticComponent<ComponentType>> = {
  "client-interaction-sop": lazy(() => import("./content/client-interaction-sop")),
  "customer-care-protocol": lazy(() => import("./content/customer-care-protocol")),
  "daily-checklists": lazy(() => import("./content/daily-checklists")),
  "discounting-guidelines": lazy(() => import("./content/discounting-guidelines")),
  "email-etiquettes": lazy(() => import("./content/email-etiquettes")),
  "house-rules": lazy(() => import("./content/house-rules")),
  "sanitization-and-sterilization": lazy(() => import("./content/sanitization-and-sterilization")),
  "tele-calling-guidelines": lazy(() => import("./content/tele-calling-guidelines")),
  "telephone-etiquettes": lazy(() => import("./content/telephone-etiquettes")),
};
