import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";
import { getLocation } from "@/lib/auth";

/* ---- Operational tickets (Staffing / Training) ---- */
export interface Ticket {
  id: number;
  ticketType: number;            // 1 = Staffing, 2 = Training
  ticketTime?: string;
  closed?: boolean;
  subject?: string;
  message?: string;
  location?: { name?: string };
  ticketFeedbacks?: unknown[];
  [k: string]: unknown;
}
interface TicketListResponse { tickets: Ticket[]; count: number; }

/** type: 1 Staffing | 2 Training. master = corporate (sees all locations). */
export function useTickets(page: number, limit: number, closed: boolean, type: 1 | 2) {
  const master = getLocation()?.locationId === 1;
  return useQuery({
    queryKey: ["tickets", page, limit, closed, type, master],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => api.get<TicketListResponse>(
      `/tickets?page=${page}&limit=${limit}&closed=${closed}&master=${master}&type=${type}`
    ),
  });
}

export function useTicketDetail(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["ticket", id],
    enabled: isApiConfigured() && id != null && enabled,
    queryFn: () => api.get<Ticket>(`/tickets/${id}`),
  });
}

/* ---- Create operational tickets ---- */
export interface StaffTicketInput {
  staffType: number;
  staffLevel: string;
  staffGender: "male" | "female";
  ticketsTargetDate: string;
  ticketsGracePeriod: 5 | 10;
  subject: string;
  message: string;
  salaryRange: string;
  staffRequestType: 1 | 2;
}
export function useCreateStaffTicket() {
  const locationId = getLocation()?.locationId;
  return useMutation({
    mutationFn: (input: StaffTicketInput) =>
      api.post(`/tickets/staff`, { ...input, ticketType: 1, locationId: Number(locationId) }),
  });
}

export interface TrainingTicketInput {
  trainingFor: string;
  ticketsTargetDate: string;
  subject: string;
  message: string;
}
export function useCreateTrainingTicket() {
  const locationId = getLocation()?.locationId;
  return useMutation({
    mutationFn: (input: TrainingTicketInput) =>
      api.post(`/tickets/training`, { ...input, ticketType: 2, locationId: Number(locationId) }),
  });
}

/* ---- OTP-protected close ---- */
export function sendTicketOtp() { return api.post(`/tickets/send-otp`); }
export function verifyTicketOtp(otp: string) { return api.post<{ valid?: boolean }>(`/tickets/verify-otp`, { otp }); }
export function useCloseTicket() {
  return useMutation({ mutationFn: (id: number) => api.patch(`/tickets/${id}/close`) });
}

/* ---- Comments / replies ---- */
export function useAddTicketComment() {
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => api.post(`/tickets/${id}/comment`, { comment }),
  });
}
export function useAddTicketReply() {
  return useMutation({
    mutationFn: ({ id, commentId, reply }: { id: number; commentId: number; reply: string }) =>
      api.post(`/tickets/${id}/comment/${commentId}/reply`, { reply }),
  });
}

/* ---- Staff Exit tickets (separate system) ---- */
export interface ExitTicket {
  id: number;
  candidateName?: string;
  candidatePhoneNumber?: string;
  candidateDesignation?: number;
  joiningDate?: string;
  relievingDate?: string;
  leavingReason?: string;
  noticePeriod?: number;
  candidateSalary?: number;
  location?: { name?: string };
  ticketTime?: string;
  [k: string]: unknown;
}
interface ExitListResponse { tickets?: ExitTicket[]; data?: ExitTicket[]; count: number; }
export function useExitTickets(page: number, limit: number) {
  return useQuery({
    queryKey: ["exit-tickets", page, limit],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await api.get<ExitListResponse>(`/tickets/exit?page=${page}&limit=${limit}`);
      return { tickets: res.tickets ?? res.data ?? [], count: res.count ?? 0 };
    },
  });
}

export interface ExitTicketInput {
  candidateName: string;
  candidateEmail: string;
  candidatePhoneNumber: string;
  candidateDesignation: number;
  joiningDate: string;
  relievingDate: string;
  leavingReason: string;
  noticePeriod: number;
  candidateSalary: number;
  companyReviewCandidate: string;
  otherCommentsCandidate: string;
}
export function useCreateExitTicket() {
  const locationId = getLocation()?.locationId;
  return useMutation({
    mutationFn: (input: ExitTicketInput) =>
      api.post(`/tickets/exit`, { ...input, ticketType: 3, locationId: Number(locationId) }),
  });
}

export const ticketTypeLabel = (t: number) => (t === 1 ? "Staffing" : t === 2 ? "Training" : "Other");
