export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const accessTokenKey = "sipena.accessToken";

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "role" in value &&
    typeof value.role === "string"
  );
}

function clearStoredAccessTokens() {
  window.localStorage.removeItem(accessTokenKey);
  window.sessionStorage.removeItem(accessTokenKey);
}

export async function login(
  credentials: LoginCredentials,
  rememberMe: boolean,
): Promise<LoginResult> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ ...credentials, rememberMe }),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Email atau kata sandi tidak valid. Silakan coba lagi.";
    throw new Error(message);
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("accessToken" in payload) ||
    typeof payload.accessToken !== "string" ||
    !("user" in payload) ||
    typeof payload.user !== "object" ||
    payload.user === null ||
    !("id" in payload.user) ||
    !("name" in payload.user) ||
    !("email" in payload.user) ||
    !("role" in payload.user) ||
    typeof payload.user.id !== "string" ||
    typeof payload.user.name !== "string" ||
    typeof payload.user.email !== "string" ||
    typeof payload.user.role !== "string"
  ) {
    throw new Error("Respons login dari server tidak sesuai format.");
  }

  clearStoredAccessTokens();

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(accessTokenKey, payload.accessToken);

  return {
    accessToken: payload.accessToken,
    user: {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      role: payload.user.role,
    },
  };
}

export async function restoreSession(): Promise<AuthUser | null> {
  const accessToken =
    window.localStorage.getItem(accessTokenKey) ??
    window.sessionStorage.getItem(accessTokenKey);

  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    clearStoredAccessTokens();
    return null;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error("Sesi tidak dapat diperiksa. Silakan coba lagi.");
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("user" in payload) ||
    !isAuthUser(payload.user)
  ) {
    throw new Error("Respons sesi dari server tidak sesuai format.");
  }

  return payload.user;
}

export async function logout(accessToken: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/logout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Sesi tidak dapat diakhiri di server.");
  }

  clearStoredAccessTokens();
}

export function getStoredAccessToken(): string | null {
  return (
    window.localStorage.getItem(accessTokenKey) ??
    window.sessionStorage.getItem(accessTokenKey)
  );
}

export function clearAccessToken(): void {
  clearStoredAccessTokens();
}
