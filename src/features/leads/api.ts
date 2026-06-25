import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** GET /leads/ row shape (verified against the live API). */
export interface Lead {
  id: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  statusId?: number;
  dateCreated?: string;
  isConverted?: boolean;
  fromCampaign?: number;
  followupDate?: string | null;
  referrerCustomerId?: number | null;
  leadStatus?: { id: number; status: string };
  leadSource?: { id: number; source: string };
  [k: string]: unknown;
}

export interface LeadListResponse {
  leads: Lead[];
  count: number;
}

export interface LeadFilters {
  name?: string;
  status?: string; // csv of status ids
  source?: string; // csv of source ids
  startDate?: string;
  endDate?: string;
  followupDateStart?: string;
  followupDateEnd?: string;
}

export function useLeads(page: number, limit: number, f: LeadFilters) {
  return useQuery({
    queryKey: ["leads", page, limit, f],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const qp = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (f.name) qp.set("name", f.name);
      if (f.status) qp.set("status", f.status);
      if (f.source) qp.set("source", f.source);
      if (f.startDate) qp.set("startDate", f.startDate);
      if (f.endDate) qp.set("endDate", f.endDate);
      if (f.followupDateStart) qp.set("followupDateStart", f.followupDateStart);
      if (f.followupDateEnd) qp.set("followupDateEnd", f.followupDateEnd);
      return api.get<LeadListResponse>(`/leads/?${qp.toString()}`);
    },
  });
}

export interface LeadStatus {
  id: number;
  status: string;
}

/** GET /leads/statuses */
export function useLeadStatuses() {
  return useQuery({
    queryKey: ["lead-statuses"],
    enabled: isApiConfigured(),
    staleTime: 60 * 60 * 1000,
    queryFn: () => api.get<LeadStatus[]>("/leads/statuses"),
  });
}

export interface LeadSource {
  id: number | string;
  source: string;
}

/** GET /leads/sources */
export function useLeadSources() {
  return useQuery({
    queryKey: ["lead-sources"],
    enabled: isApiConfigured(),
    staleTime: 60 * 60 * 1000,
    queryFn: () => api.get<LeadSource[]>("/leads/sources"),
  });
}

/** GET /leads/feedback/:id — lead notes / follow-up history (View modal). */
export interface LeadFeedback {
  id?: number | string;
  feedback?: string;
  followupDate?: string | null;
  statusId?: number;
  leadStatus?: { id: number; status: string };
  dateCreated?: string;
  createdBy?: string;
  [k: string]: unknown;
}
export function useLeadFeedback(leadId: number | string | null, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["lead-feedback", leadId, page, limit],
    enabled: isApiConfigured() && leadId != null,
    queryFn: () => api.get<{ feedback?: LeadFeedback[]; history?: LeadFeedback[]; count?: number } | LeadFeedback[]>(
      `/leads/feedback/${leadId}?page=${page}&limit=${limit}`
    ),
  });
}

export const leadName = (l: Lead) =>
  [l.firstName, l.lastName].filter(Boolean).join(" ").trim() || "—";

/* ---- Create lead (POST /leads) ---- */
export interface NewLeadInput {
  firstName: string;
  lastName?: string;
  email: string;
  mobile: string;
  statusId: string;
  fromCampaign: string;
  followupDate: string;
  leadFeedback?: string;
}
export function useCreateLead() {
  return useMutation({
    mutationFn: (input: NewLeadInput) =>
      api.post(`/leads`, {
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() ?? "",
        email: input.email.trim(),
        mobile: input.mobile.trim(),
        statusId: Number(input.statusId),
        fromCampaign: Number(input.fromCampaign),
        followupDate: input.followupDate || null,
        leadFeedback: input.leadFeedback?.trim() ? [input.leadFeedback.trim()] : null,
      }),
  });
}

/* ---- Update lead status / feedback / follow-up (PATCH /leads/:id) ---- */
export interface UpdateLeadInput {
  statusId: string;
  followupDate?: string;
  leadFeedback?: string;
}
export function useUpdateLead() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number | string; input: UpdateLeadInput }) =>
      api.patch(`/leads/${id}`, {
        statusId: Number(input.statusId),
        followupDate: input.followupDate || null,
        leadFeedback: input.leadFeedback?.trim() ? [input.leadFeedback.trim()] : null,
      }),
  });
}

/* ---- Appointment: check customer exists, then create (POST /customers) ---- */
export function checkCustomerExists(phone: string, email: string) {
  const qp = new URLSearchParams();
  if (phone) qp.set("phone", phone);
  if (email) qp.set("email", email);
  return api.get<{ exist: boolean }>(`/customers/exists?${qp.toString()}`);
}
export interface AppointmentCustomerInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber: string;
  gender: string;
  sourceId: number | string;
}
export function useCreateAppointmentCustomer() {
  return useMutation({
    mutationFn: (input: AppointmentCustomerInput) =>
      api.post(`/customers`, {
        firstName: input.firstName,
        lastName: input.lastName ?? "",
        email: input.email ?? "",
        phoneNumber: input.phoneNumber,
        gender: input.gender,
        birthday: null,
        anniversary: null,
        sourceId: input.sourceId,
      }),
  });
}

/* ---- SMS templates + send promotion (POST /promotions/send) ---- */
export interface SmsTemplate {
  id: number | string;
  title: string;
  body: string;
}
export function useSmsTemplates() {
  return useQuery({
    queryKey: ["sms-templates"],
    enabled: isApiConfigured(),
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get<{ statusCode?: number; templates?: SmsTemplate[] }>(`/promotions/templates`);
      if (res && (res as { statusCode?: number }).statusCode) return [];
      return res.templates ?? [];
    },
  });
}

export function useSendSms() {
  return useMutation({
    mutationFn: ({ message, mobile }: { message: string; mobile: string }) =>
      api.post(`/promotions/send`, {
        deliverychannel: "sms",
        sendTo: 3,
        template: message,
        numbers: String(mobile),
      }),
  });
}

export function useSendWhatsapp() {
  return useMutation({
    mutationFn: ({ templateId, variable1, variable2, mobile }: {
      templateId: string; variable1: string; variable2: string; mobile: string;
    }) =>
      api.post(`/promotions/send`, {
        deliverychannel: "whatsapp",
        sendTo: 3,
        message: { template: templateId || "", parameters: { variable1, variable2 } },
        numbers: String(mobile),
      }),
  });
}
