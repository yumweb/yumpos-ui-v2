import { useQuery, useMutation } from "@tanstack/react-query";
import { api, isApiConfigured, ApiError } from "@/lib/apiClient";
import { getLocation } from "@/lib/auth";

export interface EmployeeRow {
  personId: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
}
interface RawConnection {
  person?: { id?: number; firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  employee?: { username?: string };
}
interface RawLocationData {
  employeeConnection?: RawConnection[];
}

/** Employees at the current location come from GET /locations/:id employeeConnection. */
export function useEmployees() {
  const locationId = getLocation()?.locationId;
  return useQuery({
    queryKey: ["employees", locationId],
    enabled: isApiConfigured() && locationId != null,
    queryFn: async () => {
      const res = await api.get<RawLocationData>(`/locations/${locationId}`);
      return (res.employeeConnection ?? [])
        .filter((c) => c.person?.id != null)
        .map((c): EmployeeRow => ({
          personId: c.person!.id!,
          firstName: c.person?.firstName ?? "",
          lastName: c.person?.lastName ?? "",
          username: c.employee?.username ?? "",
          email: c.person?.email ?? "",
          phoneNumber: c.person?.phoneNumber ?? "",
        }));
    },
  });
}

/* ---- Locations the current user can assign (GET /users/get-locations) ---- */
export interface UserLocation { locationId: number; name: string; }
export function useUserLocations() {
  return useQuery({
    queryKey: ["user-locations"],
    enabled: isApiConfigured(),
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get<{ locations?: UserLocation[] }>(`/users/get-locations`);
      return res.locations ?? [];
    },
  });
}

/* ---- Employee detail for edit (GET /users/employee/:personId) ---- */
export interface EmployeeDetail {
  person?: { id?: number; firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  employeeGender?: number | string;
  employeeType?: string;
  role?: string;
  username?: string;
  locations?: Array<{ locationId: number }>;
  [k: string]: unknown;
}
export function useEmployeeDetail(personId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["employee-detail", personId],
    enabled: isApiConfigured() && personId != null && enabled,
    queryFn: () => api.get<EmployeeDetail>(`/users/employee/${personId}`),
  });
}

/* ---- Create (POST /users/create-employee) ---- */
export interface NewEmployeeInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  employeeGender: string;       // "1" | "2"
  employeeType?: string;        // "admin" | "user" (admin-only)
  userName: string;
  password: string;
  employeeLocation: number[];
}
export function useCreateEmployee() {
  return useMutation({
    mutationFn: (input: NewEmployeeInput) =>
      api.post(`/users/create-employee`, {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phoneNumber: input.phoneNumber.trim(),
        ...(input.email?.trim() ? { email: input.email.trim() } : {}),
        employeeGender: Number(input.employeeGender),
        ...(input.employeeType ? { employeeType: input.employeeType } : {}),
        userName: input.userName.trim(),
        password: input.password,
        employeeLocation: input.employeeLocation,
      }),
  });
}

/* ---- Update (PATCH /users/employee/:id changed fields + /locations) ---- */
export interface UpdateEmployeeInput {
  personId: number;
  fields: Record<string, unknown>;     // changed simple fields only
  addedLocations: number[];
  removedLocations: number[];
}
export function useUpdateEmployee() {
  return useMutation({
    mutationFn: async ({ personId, fields, addedLocations, removedLocations }: UpdateEmployeeInput) => {
      if (Object.keys(fields).length > 0) {
        await api.patch(`/users/employee/${personId}`, fields);
      }
      if (addedLocations.length > 0 || removedLocations.length > 0) {
        await api.patch(`/users/employee/${personId}/locations`, {
          locations: { added: addedLocations, removed: removedLocations },
        });
      }
    },
  });
}

/* ---- Delete (DELETE /users/employee?employeeId=:personId) ---- */
export function useDeleteEmployee() {
  return useMutation({
    mutationFn: async (personId: number) => {
      try {
        await api.delete(`/users/employee?employeeId=${personId}`);
      } catch (e) {
        // 200 with empty body can surface as a parse error; treat as success.
        if (e instanceof ApiError && e.status >= 400) throw e;
      }
    },
  });
}

export const employeeFullName = (e: EmployeeRow) =>
  [e.firstName, e.lastName].filter(Boolean).join(" ").trim() || "—";
