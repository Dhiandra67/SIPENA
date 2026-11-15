import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPanel from "./AdminPanel";

describe("panel admin modular", () => {
  it("membuat siswa baru dari halaman data siswa", () => {
    render(<AdminPanel onNavigate={() => undefined} route="students" />);

    fireEvent.click(screen.getByRole("button", { name: /Tambah siswa/i }));
    fireEvent.change(screen.getByLabelText("NIS"), { target: { value: "2026010" } });
    fireEvent.change(screen.getByLabelText("NISN"), { target: { value: "0123456710" } });
    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Kirana Putri" } });
    fireEvent.change(screen.getByLabelText("Jenis kelamin"), { target: { value: "P" } });
    fireEvent.change(screen.getByLabelText("Kode kelas"), { target: { value: "VII-A" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Aktif" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(screen.getByText("Kirana Putri")).toBeInTheDocument();
  });

  it("membuka rekap nilai dari dashboard admin", () => {
    const onNavigate = vi.fn();
    render(<AdminPanel onNavigate={onNavigate} route="dashboard" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Lihat Nilai" })[0]);

    expect(onNavigate).toHaveBeenCalledWith("grades");
  });
});
