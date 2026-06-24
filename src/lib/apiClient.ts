/**
 * Typed port of the existing yumpos-ui apiClient contract:
 * - x-api-key + Bearer token (localStorage `yumpos_token`)
 * - 401 => clear token + redirect to "/"
 * Same headers/behaviour so it talks to the existing backend unchanged.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

const TOKEN_KEY = "yumpos_token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const isApiConfigured = () => Boolean(BASE_URL && API_KEY);

function headers(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "x-api-key": API_KEY,
    accept: "application/json",
    "content-type": "application/json",
    authorization: `Bearer ${token ?? ""}`,
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(url: string, signal?: AbortSignal) =>
    fetch(`${BASE_URL}${url}`, { headers: headers(), signal }).then(handle<T>),
  post: <T>(url: string, body?: unknown) =>
    fetch(`${BASE_URL}${url}`, { method: "POST", headers: headers(), body: JSON.stringify(body ?? {}) }).then(handle<T>),
  patch: <T>(url: string, body?: unknown) =>
    fetch(`${BASE_URL}${url}`, { method: "PATCH", headers: headers(), body: JSON.stringify(body ?? {}) }).then(handle<T>),
  put: <T>(url: string, body?: unknown) =>
    fetch(`${BASE_URL}${url}`, { method: "PUT", headers: headers(), body: JSON.stringify(body ?? {}) }).then(handle<T>),
  delete: <T>(url: string, body?: unknown) =>
    fetch(`${BASE_URL}${url}`, { method: "DELETE", headers: headers(), body: JSON.stringify(body ?? {}) }).then(handle<T>),
};
