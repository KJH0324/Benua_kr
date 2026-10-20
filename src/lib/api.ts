import { isNativeApp } from "./subdomain";

export const API_BASE_URL = isNativeApp()
  ? import.meta.env.VITE_API_BASE_URL || "https://benua.shop"
  : "";

const USER_TOKEN_KEY = "benua_user_token";
const ADMIN_TOKEN_KEY = "benua_admin_token";

export const authStorage = {
  getUserToken: () => localStorage.getItem(USER_TOKEN_KEY),
  setUserToken: (token: string) => localStorage.setItem(USER_TOKEN_KEY, token),
  clearUserToken: () => localStorage.removeItem(USER_TOKEN_KEY),

  getAdminToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  setAdminToken: (token: string) => localStorage.setItem(ADMIN_TOKEN_KEY, token),
  clearAdminToken: () => localStorage.removeItem(ADMIN_TOKEN_KEY),
};

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Authorization")) {
    if (path.startsWith("/api/admin")) {
      const adminToken = authStorage.getAdminToken();
      if (adminToken) headers.set("Authorization", `Bearer ${adminToken}`);
    } else {
      const userToken = authStorage.getUserToken();
      if (userToken) headers.set("Authorization", `Bearer ${userToken}`);
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}