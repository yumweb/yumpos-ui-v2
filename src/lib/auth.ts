/** Session storage — keys kept identical to the existing app for interop. */
const TOKEN = "yumpos_token";
const LOCATION = "yumpos_location";
const USER = "yumpos_user_info";

export interface StoredLocation {
  locationId: number | string;
  locationName?: string;
  name?: string;
  [k: string]: unknown;
}

export const getToken = () => localStorage.getItem(TOKEN);

export function getLocation(): StoredLocation | null {
  try {
    return JSON.parse(localStorage.getItem(LOCATION) || "null");
  } catch {
    return null;
  }
}

export function getUser<T = Record<string, unknown>>(): T | null {
  try {
    return JSON.parse(localStorage.getItem(USER) || "null");
  } catch {
    return null;
  }
}

/** Authenticated = has a token AND a chosen location (two-step login, as today). */
export const isAuthenticated = () => Boolean(getToken() && localStorage.getItem(LOCATION));

export const setToken = (t: string) => localStorage.setItem(TOKEN, t);

export function setSession(token: string, location: StoredLocation, userInfo?: unknown) {
  setToken(token);
  localStorage.setItem(LOCATION, JSON.stringify(location));
  if (userInfo) localStorage.setItem(USER, JSON.stringify(userInfo));
}

export function logout() {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(LOCATION);
  localStorage.removeItem(USER);
  window.location.href = "/login";
}
