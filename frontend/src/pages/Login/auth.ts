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
    body: JSON.stringify(credentials),
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

  window.localStorage.removeItem("sipena.accessToken");
  window.sessionStorage.removeItem("sipena.accessToken");

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem("sipena.accessToken", payload.accessToken);

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
