import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./Login";
import { login } from "./auth";
import type { AuthUser } from "./auth";

vi.mock("./auth", () => ({
  login: vi.fn(),
}));

const user: AuthUser = {
  id: "teacher-1",
  name: "Guru SIPENA",
  email: "guru@example.com",
  role: "guru",
};

describe("formulir login", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
  });

  it("mengirim email yang dinormalisasi dan meneruskan pengguna berhasil login", async () => {
    const onLoginSuccess = vi.fn();
    vi.mocked(login).mockResolvedValue({ accessToken: "token", user });
    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "  GURU@EXAMPLE.COM  " },
    });
    fireEvent.change(screen.getByLabelText("Kata sandi"), {
      target: { value: "rahasia" },
    });
    fireEvent.click(screen.getByLabelText("Ingat saya"));
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        { email: "guru@example.com", password: "rahasia" },
        true,
      );
    });
    expect(onLoginSuccess).toHaveBeenCalledWith(user);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Berhasil masuk. Selamat datang, Guru SIPENA.",
    );
  });

  it("menampilkan pesan kesalahan dari proses login", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Kredensial tidak valid."));
    render(<LoginPage onLoginSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText("Kata sandi"), {
      target: { value: "salah" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Kredensial tidak valid.",
    );
  });

  it("dapat menampilkan dan menyembunyikan kata sandi", () => {
    render(<LoginPage onLoginSuccess={vi.fn()} />);
    const password = screen.getByLabelText("Kata sandi");

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan kata sandi" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan kata sandi" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("mengisi kredensial demo admin melalui tombol bantuan", () => {
    render(<LoginPage onLoginSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Gunakan akun admin" }));

    expect(screen.getByLabelText("Email")).toHaveValue("test@example.com");
    expect(screen.getByLabelText("Kata sandi")).toHaveValue("password");
  });
});
