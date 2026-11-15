import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherPanel from "./TeacherPanel";

const xlsxMocks = vi.hoisted(() => ({
  aoaToSheet: vi.fn(() => ({})),
  bookNew: vi.fn(() => ({})),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: xlsxMocks.aoaToSheet,
    book_new: xlsxMocks.bookNew,
    book_append_sheet: xlsxMocks.bookAppendSheet,
  },
  writeFile: xlsxMocks.writeFile,
}));

const period = "2026/2027 · Ganjil";
const workspace = {
  data: {
    assignments: [{
      id: "math-vii-a",
      subject: "Matematika",
      className: "VII-A",
      period,
      kkm: 75,
      students: [
        { id: "s1", nis: "2026001", name: "Andi Pratama", gender: "L" },
        { id: "s2", nis: "2026002", name: "Budi Santoso", gender: "L" },
      ],
    }],
    componentsByAssignment: {
      "math-vii-a": [
        { id: "daily", name: "Tugas Harian", weight: "50" },
        { id: "quiz", name: "Ulangan Harian", weight: "50" },
      ],
    },
    scores: {
      s1: { daily: "80", quiz: "90" },
      s2: { daily: "75", quiz: "" },
    },
    grades: [
      { letter: "A", lower: 85, upper: 100 },
      { letter: "B", lower: 70, upper: 84.99 },
      { letter: "C", lower: 55, upper: 69.99 },
      { letter: "D", lower: 0, upper: 54.99 },
    ],
    periods: [{ id: "period-1", name: period, isActive: true }],
    selectedPeriod: period,
  },
};

describe("rekap nilai pada detail kelas", () => {
  beforeEach(() => {
    window.localStorage.setItem("sipena.accessToken", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => workspace,
    }));
  });

  it("menampilkan nilai per komponen dan status, tanpa pilihan statistik", async () => {
    render(
      <TeacherPanel
        displayName="Guru"
        email="guru@example.com"
        onNavigate={() => undefined}
        onProfileChange={() => undefined}
        route="class-detail"
      />,
    );

    expect(await screen.findByRole("heading", { name: "Rekapitulasi Nilai" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tugas Harian" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Ulangan Harian" })).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("85.00")).toBeInTheDocument();
    expect(screen.getByText("Belum lengkap")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /lihat statistik/i })).not.toBeInTheDocument();
  });

  it("mengunduh nilai komponen, nilai akhir, dan status ke Excel", async () => {
    render(
      <TeacherPanel
        displayName="Guru"
        email="guru@example.com"
        onNavigate={() => undefined}
        onProfileChange={() => undefined}
        route="class-detail"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Unduh XLSX" }));

    await waitFor(() => {
      expect(xlsxMocks.aoaToSheet).toHaveBeenCalledWith([
        ["No", "NIS", "Nama Siswa", "Tugas Harian", "Ulangan Harian", "Nilai Akhir", "Predikat", "Status Kesesuaian"],
        [1, "2026001", "Andi Pratama", "80", "90", 85, "A", "Tuntas"],
        [2, "2026002", "Budi Santoso", "75", "", "", "—", "Belum lengkap"],
      ]);
    });
  });
});
