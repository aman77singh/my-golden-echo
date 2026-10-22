export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5001";
    }
    if (host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.")) {
      return `http://${host}:5001`;
    }
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes("our-space-backend-8qkm") && !envUrl.includes("localhost")) {
    return envUrl;
  }
  return "https://clever-llamas-heal.loca.lt";
}

export const API_BASE_URL = getApiBaseUrl();

const TOKEN_KEY = "our_space_token";
const USER_KEY = "our_space_user";

export interface CurrentUser {
  id: string;
  coupleId: string;
  name: string;
  email: string;
  role: "her" | "him";
  avatarUrl?: string;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  window.dispatchEvent(new Event("our_space_auth_changed"));
}

export function getStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user: CurrentUser | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
  window.dispatchEvent(new Event("our_space_auth_changed"));
}

/**
 * Perform authenticated API request to backend
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getStoredToken();
  if (token === "demo-token") {
    setStoredToken(null);
    token = null;
  }

  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  headers.set("Bypass-Tunnel-Reminder", "true");

  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !endpoint.includes("/auth/")) {
    setStoredToken(null);
    setStoredUser(null);
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const apiClient = {
  get: async <T = any>(endpoint: string, options?: RequestInit) => {
    const data = await apiFetch<T>(endpoint, { ...options, method: "GET" });
    return { data };
  },
  post: async <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    const data = await apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    return { data };
  },
  patch: async <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    const data = await apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return { data };
  },
  delete: async <T = any>(endpoint: string, options?: RequestInit) => {
    const data = await apiFetch<T>(endpoint, { ...options, method: "DELETE" });
    return { data };
  },
};

/**
 * Log in with user credentials
 */
export async function loginUser(email: string, password: string): Promise<{
  accessToken: string;
  user: CurrentUser;
}> {
  const url = `${API_BASE_URL}/auth/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let msg = "Invalid credentials";
    try {
      const json = await res.json();
      msg = json.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  setStoredToken(data.accessToken);
  setStoredUser(data.user);
  return data;
}

/**
 * Log out current user and return to login
 */
export function logoutUser() {
  setStoredToken(null);
  setStoredUser(null);
  if (typeof window !== "undefined") {
    window.location.href = "/app";
  }
}

/**
 * Get current authenticated user or null
 */
export function getAuthenticatedUser(): CurrentUser | null {
  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || !user || token === "demo-token") return null;
  return user;
}

/**
 * Ensure the client has an authenticated session.
 */
export async function ensureAuthenticatedSession(): Promise<{
  token: string;
  user: CurrentUser;
} | null> {
  const existingToken = getStoredToken();
  const existingUser = getStoredUser();

  if (existingToken && existingUser && existingToken !== "demo-token") {
    return { token: existingToken, user: existingUser };
  }
  return null;
}
