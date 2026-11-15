import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAccessToken,
  getStoredAccessToken,
  login,
  logout,
  restoreSession,
} from "./auth";
import type { AuthUser } from "./auth";

const user: AuthUser = {
  id: "user-1",
  name: "Guru SIPENA",
  email: "guru@example.com",
  role: "guru",
};

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("autentikasi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it.each([
    ["ingat saya", true, window.localStorage],
    ["sesi ini saja", false, window.sessionStorage],
  ])("menyimpan token pada penyimpanan yang tepat (%s)", async (_, rememberMe, storage) => {
    window.localStorage.setItem("sipena.accessToken", "token-lama");
    window.sessionStorage.setItem("sipena.accessToken", "token-sesi-lama");
    vi.mocked(fetch).mockResolvedValue(
      response({ accessToken: "token-baru", user }),
    );

    await expect(login({ email: user.email, password: "rahasia" }, rememberMe))
      .resolves.toEqual({ accessToken: "token-baru", user });

    expect(storage.getItem("sipena.accessToken")).toBe("token-baru");
    expect(
      (storage === window.localStorage ? window.sessionStorage : window.localStorage)
        .getItem("sipena.accessToken"),
    ).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          password: "rahasia",
          rememberMe,
        }),
      }),
    );
  });

  it("mengembalikan pesan kesalahan login dari server", async () => {
    vi.mocked(fetch).mockResolvedValue(
      response({ message: "Akun tidak aktif." }, 422),
    );

    await expect(
      login({ email: user.email, password: "rahasia" }, false),
    ).rejects.toThrow("Akun tidak aktif.");
  });

  it("menolak respons login dengan format tidak valid", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ accessToken: "token", user: {} }));

    await expect(
      login({ email: user.email, password: "rahasia" }, false),
    ).rejects.toThrow("Respons login dari server tidak sesuai format.");
  });

  it("tidak meminta sesi ketika token tidak tersedia", async () => {
    await expect(restoreSession()).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("memulihkan sesi menggunakan token tersimpan", async () => {
    window.localStorage.setItem("sipena.accessToken", "token-tersimpan");
    vi.mocked(fetch).mockResolvedValue(response({ user }));

    await expect(restoreSession()).resolves.toEqual(user);
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-tersimpan",
        }),
      }),
    );
  });

  it("menghapus token saat sesi sudah tidak berlaku", async () => {
    window.localStorage.setItem("sipena.accessToken", "kadaluarsa");
    window.sessionStorage.setItem("sipena.accessToken", "token-lama");
    vi.mocked(fetch).mockResolvedValue(response({}, 401));

    await expect(restoreSession()).resolves.toBeNull();
    expect(getStoredAccessToken()).toBeNull();
  });

  it("melaporkan kegagalan server saat memeriksa sesi", async () => {
    window.sessionStorage.setItem("sipena.accessToken", "token");
    vi.mocked(fetch).mockResolvedValue(response({}, 500));

    await expect(restoreSession()).rejects.toThrow(
      "Sesi tidak dapat diperiksa. Silakan coba lagi.",
    );
  });

  it("menolak payload sesi yang tidak valid", async () => {
    window.sessionStorage.setItem("sipena.accessToken", "token");
    vi.mocked(fetch).mockResolvedValue(response({ user: { id: 1 } }));

    await expect(restoreSession()).rejects.toThrow(
      "Respons sesi dari server tidak sesuai format.",
    );
  });

  it("mencabut sesi dan membersihkan kedua penyimpanan", async () => {
    window.localStorage.setItem("sipena.accessToken", "token");
    vi.mocked(fetch).mockResolvedValue(response({}));

    await expect(logout("token")).resolves.toBeUndefined();
    expect(getStoredAccessToken()).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("mempertahankan token lokal jika pencabutan sesi gagal", async () => {
    window.localStorage.setItem("sipena.accessToken", "token");
    vi.mocked(fetch).mockResolvedValue(response({}, 500));

    await expect(logout("token")).rejects.toThrow(
      "Sesi tidak dapat diakhiri di server.",
    );
    expect(getStoredAccessToken()).toBe("token");
  });

  it("membaca token dengan prioritas localStorage dan dapat membersihkan keduanya", () => {
    window.localStorage.setItem("sipena.accessToken", "token-local");
    window.sessionStorage.setItem("sipena.accessToken", "token-sesi");
    expect(getStoredAccessToken()).toBe("token-local");

    clearAccessToken();

    expect(getStoredAccessToken()).toBeNull();
  });
});
