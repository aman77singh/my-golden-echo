const PRODUCTION_API_URL = "https://our-space-backend-8p9m.onrender.com";
const LOCAL_API_URL = "http://localhost:5001";

function isLoopbackApiUrl(url: string): boolean {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(url);
}

export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLoopbackHost = host === "localhost" || host === "127.0.0.1";
    const isLanHost =
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.");

    if (isLoopbackHost) {
      return configuredUrl || LOCAL_API_URL;
    }

    if (isLanHost) {
      return configuredUrl && !isLoopbackApiUrl(configuredUrl)
        ? configuredUrl
        : `http://${host}:5001`;
    }

    return PRODUCTION_API_URL;
  }

  return import.meta.env.DEV && configuredUrl ? configuredUrl : PRODUCTION_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();

const TOKEN_KEY = "our_space_token";
const USER_KEY = "our_space_user";

function isPlaceholderToken(token: string | null): boolean {
  return token === "demo-token" || token?.startsWith("auth-token-") === true;
}

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

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function refreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        setStoredToken(null);
        setStoredUser(null);
        return null;
      }

      const data = await res.json();
      if (data.accessToken) {
        setStoredToken(data.accessToken);
        if (data.user) {
          setStoredUser(data.user);
        }
        return data.accessToken;
      }
      return null;
    } catch (err) {
      console.warn("Token refresh failed:", err);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Perform authenticated API request to backend with automatic 401 refresh
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  let token = getStoredToken();
  if (isPlaceholderToken(token)) {
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

  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (url.includes("loca.lt")) {
    headers.set("Bypass-Tunnel-Reminder", "true");
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Handle 401 with automatic token refresh and single retry
  if (response.status === 401 && !endpoint.includes("/auth/") && !isRetry) {
    const newToken = await refreshToken();
    if (newToken) {
      return apiFetch<T>(endpoint, options, true);
    } else {
      setStoredToken(null);
      setStoredUser(null);
    }
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
  if (isPlaceholderToken(token)) {
    setStoredToken(null);
    setStoredUser(null);
    return null;
  }
  if (!token || !user) return null;
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

  if (existingToken && existingUser && !isPlaceholderToken(existingToken)) {
    return { token: existingToken, user: existingUser };
  }
  return null;
}
