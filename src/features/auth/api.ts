import { api } from "@/lib/apiClient";
import type { StoredLocation } from "@/lib/auth";

/** POST /auth/login-employee — step 1 returns a token. */
export const loginEmployee = (body: { username: string; password: string }) =>
  api.post<{ token?: string }>("/auth/login-employee", body);

/** GET /users/get-locations — locations the user can operate. */
export const getUserLocations = () =>
  api.get<{ locations: StoredLocation[] }>("/users/get-locations");

/** GET /auth/set-location/:id — step 2 returns the final token + user info. */
export const setUserLocation = (locationId: number | string) =>
  api.get<{ token?: string; userInfo?: unknown }>(`/auth/set-location/${locationId}`);
