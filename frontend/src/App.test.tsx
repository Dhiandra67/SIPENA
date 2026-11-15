import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { clearAccessToken, logout, restoreSession } from "./pages/Login/auth";
import type { AuthUser } from "./pages/Login/auth";

vi.mock("./pages/Login/auth", () => ({
  clearAccessToken: vi.fn(),
  getStoredAccessToken: vi.fn(() => "token-demo"),
  login: vi.fn(),
  logout: vi.fn(),
  restoreSession: vi.fn(),
}));

vi.mock("./pages/Admin/AdminPanel", () => ({
  default: () => <div>Panel admin teruji</div>,
}));

vi.mock("./pages/Dashboard/TeacherPanel", () => ({
  default: () => <div>Panel guru teruji</div>,
}));

const admin: AuthUser = {
  id: "admin-1",
  name: "Admin SIPENA",
  email: "admin@example.com",
  role: "admin",
};

const teacher: AuthUser = {
  id: "teacher-1",
  name: "Guru SIPENA",
  email: "guru@example.com",
  role: "guru",
};

describe("alur aplikasi", () => {
  beforeEach(() => {
    vi.mocked(restoreSession).mockResolvedValue(null);
    vi.mocked(logout).mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("menampilkan login setelah tidak menemukan sesi", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /selamat datang/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument();
  });

  it("menampilkan dashboard dan navigasi sesuai peran admin", async () => {
    vi.mocked(restoreSession).mockResolvedValue(admin);
    render(<App />);

    expect(await screen.findByText("Panel Administrasi")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /data siswa/i })).toBeInTheDocument();
    expect(screen.getByText("Panel admin teruji")).toBeInTheDocument();
  });

  it("memungkinkan admin mengedit profil dan memperbarui ke backend", async () => {
    vi.mocked(restoreSession).mockResolvedValue(admin);
    const fetchMock = vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: "Profil akun berhasil diperbarui.",
            data: { name: "Admin Utama SIPENA", email: "admin.utama@example.com", status: "Aktif" },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: { name: admin.name, email: admin.email, status: "Aktif" },
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /admin sipena/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit profil & ubah sandi/i }));

    fireEvent.change(screen.getByLabelText(/nama lengkap/i), {
      target: { value: "Admin Utama SIPENA" },
    });
    fireEvent.change(screen.getByLabelText(/email login/i), {
      target: { value: "admin.utama@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Perubahan" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/profile",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            name: "Admin Utama SIPENA",
            email: "admin.utama@example.com",
            newPassword: "",
            confirmation: "",
          }),
        }),
      );
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Profil akun berhasil diperbarui.",
    );
  });

  it("menampilkan navigasi guru dan dapat membuka menu seluler", async () => {
    vi.mocked(restoreSession).mockResolvedValue(teacher);
    render(<App />);

    expect(await screen.findByText("Guru Mata Pelajaran")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /input dan kelola nilai/i }))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }));
    expect(screen.getByRole("button", { name: "Tutup menu" }))
      .toHaveAttribute("aria-expanded", "true");
  });

  it("keluar dari dashboard dan kembali ke halaman login", async () => {
    vi.mocked(restoreSession).mockResolvedValue(admin);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /selamat datang/i }))
        .toBeInTheDocument();
    });
    expect(logout).toHaveBeenCalledWith("token-demo");
  });

  it("tetap membuka login dan mencatat kesalahan saat pemulihan sesi gagal", async () => {
    const error = new Error("Server tidak tersedia.");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(restoreSession).mockRejectedValue(error);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /selamat datang/i }))
      .toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to restore SIPENA session.",
      error,
    );
  });

  it("membersihkan token lokal jika pencabutan sesi gagal", async () => {
    const error = new Error("Server tidak tersedia.");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(restoreSession).mockResolvedValue(admin);
    vi.mocked(logout).mockRejectedValue(error);

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(clearAccessToken).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to revoke SIPENA session.",
        error,
      );
    });
    expect(await screen.findByRole("heading", { name: /selamat datang/i }))
      .toBeInTheDocument();
  });
});
