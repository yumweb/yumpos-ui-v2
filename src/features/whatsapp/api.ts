import { useQuery } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";
import { getLocation } from "@/lib/auth";

/**
 * WhatsApp Business API surface. All backend responses are wrapped as
 * `{ success, data, error? }` — `unwrap()` peels that envelope and throws on a
 * `success: false` so react-query / try-catch see a real failure.
 */
const loc = () => Number(getLocation()?.locationId);

interface Env<T> { success?: boolean; data?: T; error?: string; message?: string; statusCode?: number }

function peel<T>(r: Env<T> | T): T {
  const e = r as Env<T>;
  if (e && typeof e === "object" && "success" in e) {
    if (e.success === false) throw new Error(e.error || e.message || "Request failed");
    return (e.data ?? (e as unknown as T)) as T;
  }
  return r as T;
}

const getD = async <T>(path: string) => peel<T>(await api.get<Env<T>>(path));
const postD = async <T>(path: string, body?: unknown) => peel<T>(await api.post<Env<T>>(path, body));
const putD = async <T>(path: string, body?: unknown) => peel<T>(await api.put<Env<T>>(path, body));
const delD = async <T>(path: string) => peel<T>(await api.delete<Env<T>>(path));

/* ───────────────────────── Setup / phone ───────────────────────── */

export interface PhoneStatus {
  status?: string;
  display_phone_number?: string;
  verified_name?: string;
  registration_pin?: string;
  quality_rating?: string;
  health_status?: { entities?: Array<{ entity_type: string; can_send_message?: string; errors?: Array<{ error_description?: string; possible_solution?: string }> }> };
  [k: string]: unknown;
}
export interface OnboardingHealth {
  phoneStatus?: string;
  hasStuckAttempt?: boolean;
  hasCancelledAttempt?: boolean;
}

export const getPhoneStatus = () => getD<PhoneStatus>(`/locations/${loc()}/whatsapp/phone/status`);
export const getOnboardingHealth = () => getD<OnboardingHealth>(`/locations/${loc()}/whatsapp/onboarding/health`);
export const startEsu = () => postD<{ appId?: string; graphVersion?: string; configId?: string; solutionId?: string; featureType?: string; csrf?: string }>(`/locations/${loc()}/whatsapp/esu/start`);
export const exchangeEsu = (body: { code: string | null; sessionEvent?: unknown; csrf?: string }) => postD(`/locations/${loc()}/whatsapp/esu/exchange`, body);
export const registerPhone = (pin: string) => postD(`/locations/${loc()}/whatsapp/phone/register`, { pin });
export const deregisterPhone = (password: string) => postD(`/locations/${loc()}/whatsapp/phone/deregister`, { password });

/* ───────────────────────── Message templates ───────────────────────── */

export interface WaTemplate {
  id?: string;
  name: string;
  language: string;
  category?: string;
  status?: string;
  quality_score?: string | { score?: string };
  sent_total?: number;
  delivered_total?: number;
  components?: Array<{ type: string; format?: string; text?: string; example?: { header_text?: string[]; body_text?: string[][] }; buttons?: Array<{ type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone_number?: string; example?: string[] }> }>;
  header_media_url?: string;
  header_media_type?: string;
}

export function useWaTemplates() {
  return useQuery({
    queryKey: ["wa-templates", loc()],
    enabled: isApiConfigured(),
    queryFn: () => getD<WaTemplate[]>(`/locations/${loc()}/whatsapp/templates`),
  });
}
export const deleteWaTemplate = (name: string) => delD(`/locations/${loc()}/whatsapp/templates?name=${encodeURIComponent(name)}`);

/** Approved templates only — used by Chat for the template picker. */
export function useApprovedTemplates(enabled = true) {
  return useQuery({
    queryKey: ["wa-templates-approved", loc()],
    enabled: isApiConfigured() && enabled,
    queryFn: async () => (await getD<WaTemplate[]>(`/locations/${loc()}/whatsapp/templates`)).filter((t) => t.status === "APPROVED"),
  });
}

/* ───────────────────────── Notification templates (versioned) ───────────────────────── */

export interface SubmittedTemplate {
  id: number;
  templateName?: string;
  definitionVersion?: string;
  status?: string;
  isActive?: boolean;
}
export interface AvailableDefinition { id: number; version?: string; isCurrent?: boolean }
export type SubmittedByPurpose = Record<string, { active: SubmittedTemplate | null; all: SubmittedTemplate[] }>;
export type AvailableByPurpose = Record<string, { submitted: AvailableDefinition[]; available: AvailableDefinition[] }>;

export const getSubmittedTemplates = () => getD<SubmittedByPurpose>(`/locations/${loc()}/whatsapp/submitted-templates`);
export const getAvailableDefinitions = () => getD<AvailableByPurpose>(`/locations/${loc()}/whatsapp/available-definitions`);
export const submitDefaultTemplates = () => postD(`/locations/${loc()}/whatsapp/template-mappings/submit`);
export const syncTemplateStatuses = () => postD<{ updated?: number }>(`/locations/${loc()}/whatsapp/template-mappings/sync`);
export const submitDefinition = (definitionId: number) => postD(`/locations/${loc()}/whatsapp/submit-definition/${definitionId}`);
export const setActiveTemplate = (mappingId: number) => putD(`/locations/${loc()}/whatsapp/submitted-templates/${mappingId}/activate`);

/* ───────────────────────── Merge variables (catalog) ───────────────────────── */

export interface WaVariable { id: number; varKey: string; label: string; sample?: string; source?: string; isActive?: boolean; sortOrder?: number }
export interface UpsertVariable { varKey: string; label: string; sample?: string; source: string; isActive: boolean; sortOrder: number }

export const VARIABLE_SOURCES = [
  { value: "CUSTOMER_FIRST_NAME", label: "Customer first name" },
  { value: "CUSTOMER_FULL_NAME", label: "Customer full name" },
  { value: "CUSTOMER_PHONE", label: "Customer phone" },
  { value: "LOCATION_NAME", label: "Location / salon name" },
] as const;

const unwrapVars = (r: { data?: WaVariable[] } | WaVariable[]) => (Array.isArray(r) ? r : r.data ?? []);

export function useWaVariables(enabled = true) {
  return useQuery({
    queryKey: ["wa-variables"],
    enabled: isApiConfigured() && enabled,
    queryFn: async () => unwrapVars(await api.get<{ data?: WaVariable[] } | WaVariable[]>(`/whatsapp/variables?activeOnly=true`)),
  });
}
/** All variables (active + inactive) — for the corporate management page. */
export function useAllWaVariables(enabled = true) {
  return useQuery({
    queryKey: ["wa-variables-all"],
    enabled: isApiConfigured() && enabled,
    queryFn: async () => unwrapVars(await api.get<{ data?: WaVariable[] } | WaVariable[]>(`/whatsapp/variables?activeOnly=false`)),
  });
}
export const createWaVariable = (body: UpsertVariable) => api.post<{ id?: number; message?: string }>(`/whatsapp/variables`, body);
export const updateWaVariable = (id: number, body: UpsertVariable) => api.put<{ id?: number; message?: string }>(`/whatsapp/variables/${id}`, body);
export const deleteWaVariable = (id: number) => api.delete(`/whatsapp/variables/${id}`);

/* ───────────────────────── Template builder (create / edit) ───────────────────────── */

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
export interface TemplateButton { type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone_number?: string; example?: string[] }
export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: HeaderFormat;
  text?: string;
  example?: { header_text?: string[]; body_text?: string[][] };
  buttons?: TemplateButton[];
}
export interface CreateTemplate { name: string; language: string; category: TemplateCategory; components: TemplateComponent[] }

export const getTemplateByName = (name: string) => getD<WaTemplate | WaTemplate[]>(`/locations/${loc()}/whatsapp/templates/${encodeURIComponent(name)}`);
export const createTemplate = (body: CreateTemplate) => postD(`/locations/${loc()}/whatsapp/templates`, body);
export const updateTemplate = (templateId: string, body: { components: TemplateComponent[] }) => putD(`/locations/${loc()}/whatsapp/templates/${encodeURIComponent(templateId)}`, body);

/** Create a template whose HEADER is an uploaded media file — multipart/form-data. */
export async function createTemplateWithMedia(fields: { name: string; language: string; category: TemplateCategory; components: TemplateComponent[] }, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("name", fields.name);
  fd.append("language", fields.language);
  fd.append("category", fields.category);
  fd.append("components", JSON.stringify(fields.components));
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/locations/${loc()}/whatsapp/templates/with-media`, {
    method: "POST",
    headers: {
      "x-api-key": import.meta.env.VITE_API_KEY ?? "",
      authorization: `Bearer ${localStorage.getItem("yumpos_token") ?? ""}`,
      accept: "application/json",
    },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) throw new Error(json?.error || json?.message || `Upload failed (${res.status})`);
  return json;
}

/* ───────────────────────── Campaigns ───────────────────────── */

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
export type AudienceType = "all_customers" | "segment" | "retention" | "manual";

export interface CampaignStats {
  totalRecipients?: number;
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  failedCount?: number;
}
export interface Campaign {
  id: number;
  name: string;
  description?: string;
  templateName: string;
  templateLanguage?: string;
  templateVariables?: { body?: string[] };
  status: CampaignStatus;
  audienceType: AudienceType;
  audienceFilter?: Record<string, string>;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  stats?: CampaignStats;
}
export interface CreateCampaign {
  name: string;
  description?: string;
  templateName: string;
  templateLanguage?: string;
  templateVariables?: { body: string[] };
  audienceType: AudienceType;
  audienceFilter?: Record<string, string>;
  scheduledAt?: string;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["wa-campaigns", loc()],
    enabled: isApiConfigured(),
    queryFn: () => getD<Campaign[]>(`/whatsapp/campaigns/${loc()}`),
  });
}
export function useCampaign(id: number | undefined) {
  return useQuery({
    queryKey: ["wa-campaign", loc(), id],
    enabled: isApiConfigured() && !!id,
    queryFn: () => getD<Campaign>(`/whatsapp/campaigns/${loc()}/${id}`),
  });
}
export const createCampaign = (body: CreateCampaign) => postD<Campaign>(`/whatsapp/campaigns/${loc()}`, body);
export const updateCampaign = (id: number, body: Partial<CreateCampaign>) => putD<Campaign>(`/whatsapp/campaigns/${loc()}/${id}`, body);
export const deleteCampaign = (id: number) => delD(`/whatsapp/campaigns/${loc()}/${id}`);
export const startCampaign = (id: number) => postD(`/whatsapp/campaigns/${loc()}/${id}/start`);
export const pauseCampaign = (id: number) => postD(`/whatsapp/campaigns/${loc()}/${id}/pause`);
export const cancelCampaign = (id: number) => postD(`/whatsapp/campaigns/${loc()}/${id}/cancel`);
export const previewAudience = (audienceType: AudienceType, audienceFilter?: Record<string, string>) =>
  postD<{ count: number }>(`/whatsapp/campaigns/${loc()}/preview-audience`, { audienceType, audienceFilter });
export const addRecipients = (id: number, phoneNumbers: string[]) => postD<{ added: number }>(`/whatsapp/campaigns/${loc()}/${id}/add-recipients`, { phoneNumbers });

export interface CampaignRecipient {
  id: number;
  phoneNumber?: string;
  customerName?: string;
  status?: string;
  sentAt?: string;
  errorMessage?: string;
}
export function useCampaignRecipients(id: number | undefined, page: number, limit: number, status: string, search: string) {
  return useQuery({
    queryKey: ["wa-campaign-recipients", loc(), id, page, limit, status, search],
    enabled: isApiConfigured() && !!id,
    queryFn: () => getD<{ recipients: CampaignRecipient[]; total: number }>(
      `/whatsapp/campaigns/${loc()}/${id}/recipients?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    ),
  });
}

/* ───────────────────────── Chat ───────────────────────── */

export interface Conversation {
  id: number;
  customerId?: number;
  customerPhone: string;
  customerName?: string;
  status: "active" | "archived";
  unreadCount: number;
  lastMessageAt?: string;
}
export interface ChatMessage {
  id: number;
  conversationId: number;
  direction: "inbound" | "outbound";
  messageType: "text" | "image" | "video" | "audio" | "document" | "template";
  content?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  timestamp?: string;
}
export interface MessagesResponse {
  messages: ChatMessage[];
  conversation: Conversation;
  isWithin24HourWindow: boolean;
  windowRemainingMs: number;
}

export const getConversations = (opts: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
  const { status = "all", search = "", page = 1, limit = 100 } = opts;
  return getD<{ conversations: Conversation[] }>(
    `/whatsapp/chat/${loc()}/conversations?page=${page}&limit=${limit}&status=${status}${search ? `&search=${encodeURIComponent(search)}` : ""}`
  );
};
export const getUnreadCount = () => getD<{ unreadCount: number; total?: number }>(`/whatsapp/chat/${loc()}/unread-count`);
export const getMessages = (conversationId: number, page = 1, limit = 50) =>
  getD<MessagesResponse>(`/whatsapp/chat/${loc()}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
export const sendChatMessage = (conversationId: number, body: { type: "text" | "template"; content?: string; templateName?: string; templateLanguage?: string; variables?: Record<string, string[]> }) =>
  postD<{ messageId?: string; wamid?: string }>(`/whatsapp/chat/${loc()}/conversations/${conversationId}/send`, body);
export const startConversation = (body: { customerPhone: string; templateName: string; templateLanguage?: string; variables?: Record<string, string[]> }) =>
  postD<{ id: number }>(`/whatsapp/chat/${loc()}/start-conversation`, body);
export const markRead = (conversationId: number) => postD(`/whatsapp/chat/${loc()}/conversations/${conversationId}/read`);
export const archiveConversation = (conversationId: number) => postD(`/whatsapp/chat/${loc()}/conversations/${conversationId}/archive`);
