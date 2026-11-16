import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherPanel from "./TeacherPanel";

const xlsxMocks = vi.hoisted(() => ({
  aoaToSheet: vi.fn(() => ({})),
  bookNew: vi.fn(() => ({})),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("@e965/xlsx/dist/xlsx.mini.min.js", () => ({
  default: {
    utils: {
      aoa_to_sheet: xlsxMocks.aoaToSheet,
      book_new: xlsxMocks.bookNew,
      book_append_sheet: xlsxMocks.bookAppendSheet,
    },
    writeFile: xlsxMocks.writeFile,
  },
}));

const period = "2026/2027 · Ganjil";
const workspace = {
  data: {
    assignments: [
      {
        id: "math-vii-a",
        subject: "Matematika",
        className: "VII-A",
        period,
        kkm: 75,
        students: [
          { id: "s1", nis: "2026001", name: "Andi Pratama", gender: "L" },
          { id: "s2", nis: "2026002", name: "Budi Santoso", gender: "L" },
        ],
      },
    ],
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
    scoreEntries: {
      s1: { daily: ["80"], quiz: ["90"] },
      s2: { daily: ["75"], quiz: [] },
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => workspace,
      }),
    );
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
        [
          "No",
          "NIS",
          "Nama Siswa",
          "Tugas Harian",
          "Ulangan Harian",
          "Nilai Akhir",
          "Predikat",
          "Status Kesesuaian",
        ],
        [1, "2026001", "Andi Pratama", "80", "90", 85, "A", "Tuntas"],
        [2, "2026002", "Budi Santoso", "75", "", "", "—", "Belum lengkap"],
      ]);
    });
  });

  it("memfilter status ketuntasan dan meletakkan tombol simpan setelah tabel", async () => {
    render(
      <TeacherPanel
        displayName="Guru"
        email="guru@example.com"
        onNavigate={() => undefined}
        onProfileChange={() => undefined}
        route="grade-entry"
      />,
    );

    const filter = await screen.findByLabelText("Filter status ketuntasan");
    expect(screen.queryByText("Filter status ketuntasan")).not.toBeInTheDocument();
    fireEvent.change(filter, { target: { value: "Tuntas" } });
    expect(screen.getByText("Andi Pratama")).toBeInTheDocument();
    expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Predikat" })).not.toBeInTheDocument();

    const table = screen.getByRole("table");
    const saveButton = screen.getByRole("button", { name: "Simpan nilai" });
    expect(table.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("menyimpan beberapa entri nilai untuk satu komponen", async () => {
    const fetchMock = vi.mocked(fetch);
    render(
      <TeacherPanel
        displayName="Guru"
        email="guru@example.com"
        onNavigate={() => undefined}
        onProfileChange={() => undefined}
        route="grade-entry"
      />,
    );

    const trigger = await screen.findByLabelText("Tugas Harian Andi Pratama: rata-rata 80,00");
    fireEvent.click(trigger);
    const scoreInput = screen.getByLabelText("Nilai baru Tugas Harian untuk Andi Pratama");
    const tableCell = trigger.closest("td");
    expect(tableCell).not.toBeNull();
    expect(scoreInput.closest("td")).toBe(tableCell);
    const entryList = within(tableCell as HTMLElement).getByRole("list");
    expect(within(entryList).getByText("Nilai 1")).toBeInTheDocument();
    expect(within(entryList).getByText("80,00")).toBeInTheDocument();
    expect(within(tableCell as HTMLElement).queryByText("Tugas Harian")).not.toBeInTheDocument();
    fireEvent.change(scoreInput, {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah" }));
    expect(document.activeElement).toBe(scoreInput);
    expect(scoreInput).toHaveValue(null);
    expect(within(entryList).getByText("Nilai 2")).toBeInTheDocument();
    expect(within(entryList).getByText("100,00")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Tugas Harian Andi Pratama: rata-rata 90,00"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Simpan nilai" }));
    await waitFor(() => {
      const saveCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/v1/pengajaran/math-vii-a/nilai"),
      );
      expect(saveCall).toBeDefined();
      expect(JSON.parse(String(saveCall?.[1]?.body))).toMatchObject({
        scores: { s1: { daily: "90" } },
        scoreEntries: { s1: { daily: ["80", "100"] } },
      });
    });
  });

  it("menyimpan KKM dari tabel pengaturan nilai", async () => {
    const fetchMock = vi.mocked(fetch);
    render(
      <TeacherPanel
        displayName="Guru"
        email="guru@example.com"
        onNavigate={() => undefined}
        onProfileChange={() => undefined}
        route="grade-settings"
      />,
    );

    fireEvent.change(await screen.findByLabelText("KKM Matematika VII-A"), {
      target: { value: "80" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan KKM" }));

    await waitFor(() => {
      const saveCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/v1/pengajaran/math-vii-a/kkm"),
      );
      expect(saveCall).toBeDefined();
      expect(JSON.parse(String(saveCall?.[1]?.body))).toEqual({ kkm: 80 });
    });
  });
});
