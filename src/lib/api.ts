export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

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

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Auto recover from 401 by attempting seed login
  if (response.status === 401 && !endpoint.includes("/auth/")) {
    try {
      const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: "aman@ourspace.local",
          password: "14/27",
        }),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        setStoredToken(loginData.accessToken);
        setStoredUser(loginData.user);
        headers.set("Authorization", `Bearer ${loginData.accessToken}`);
        response = await fetch(url, {
          ...options,
          headers,
          credentials: "include",
        });
      }
    } catch {}
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
 * Ensure the client has an authenticated session.
 * Logs in with seed credentials if not authenticated.
 */
export async function ensureAuthenticatedSession(): Promise<{
  token: string;
  user: CurrentUser;
}> {
  const existingToken = getStoredToken();
  const existingUser = getStoredUser();

  if (existingToken && existingUser && existingToken !== "demo-token") {
    return { token: existingToken, user: existingUser };
  }

  try {
    // Attempt login with default seeded Aman credentials
    const res = await apiFetch<{ accessToken: string; user: CurrentUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "aman@ourspace.local",
        password: "14/27",
      }),
    });

    setStoredToken(res.accessToken);
    setStoredUser(res.user);
    return { token: res.accessToken, user: res.user };
  } catch (err) {
    // Fallback: mock offline demo user
    const fallbackUser: CurrentUser = {
      id: "demo-user-1",
      coupleId: "demo-couple-1",
      name: "Aman",
      email: "aman@ourspace.local",
      role: "him",
    };
    setStoredUser(fallbackUser);
    return { token: "demo-token", user: fallbackUser };
  }
}
