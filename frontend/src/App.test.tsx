import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { logout, restoreSession } from "./pages/Login/auth";
import type { AuthUser } from "./pages/Login/auth";

vi.mock("./pages/Login/auth", () => ({
  clearAccessToken: vi.fn(),
  getStoredAccessToken: vi.fn(() => "token-demo"),
  login: vi.fn(),
  logout: vi.fn(),
  restoreSession: vi.fn(),
}));

vi.mock("./pages/Dashboard/AdminPanel", () => ({
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
});
