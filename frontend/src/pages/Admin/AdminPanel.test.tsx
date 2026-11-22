import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "./AdminPanel";

const spreadsheetMocks = vi.hoisted(() => ({
  downloadSpreadsheet: vi.fn(),
  readSpreadsheetFile: vi.fn(),
}));

vi.mock("../../lib/spreadsheet", () => spreadsheetMocks);

afterEach(() => {
  vi.useRealTimers();
});

const overviewPayload = {
  data: {
    academic: [
      { id: "p1", name: "2026/2027 · Ganjil", status: "Aktif" },
      { id: "p2", name: "2026/2027 · Genap", status: "Tidak aktif" },
    ],
    students: [
      {
        id: "101",
        nis: "2026001",
        nisn: "0123456701",
        name: "Andi Pratama",
        gender: "L",
        className: "VII-A",
        status: "Aktif",
      },
    ],
    teachers: [
      {
        id: "201",
        nip: "198501012010011001",
        name: "Sari Wulandari, S.Pd.",
        gender: "P",
        email: "sari@sekolah.sch.id",
        status: "Aktif",
      },
    ],
    classes: [
      {
        id: "301",
        code: "VII-A",
        name: "VII-A",
        level: "VII",
        homeroom: "Sari Wulandari, S.Pd.",
        period: "2026/2027 · Ganjil",
        students: "1",
      },
    ],
    subjects: [
      { id: "401", code: "MAT", name: "Matematika", group: "Umum", status: "Aktif" },
    ],
    assignments: [],
  },
};

describe("panel admin modular", () => {
  it("membatasi notifikasi tambah siswa ke halaman terkait selama 10 detik", () => {
    window.localStorage.removeItem("sipena.accessToken");
    vi.useFakeTimers();
    const { rerender } = render(<AdminPanel onNavigate={() => undefined} route="students" />);

    fireEvent.click(screen.getByRole("button", { name: /Tambah siswa/i }));
    expect(screen.queryByRole("option", { name: "Lulus" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Pindah" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Aktif" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Nonaktif" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("NIS"), { target: { value: "2026010" } });
    fireEvent.change(screen.getByLabelText("NISN"), { target: { value: "0123456710" } });
    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Kirana Putri" } });
    fireEvent.change(screen.getByLabelText("Jenis kelamin"), { target: { value: "P" } });
    fireEvent.change(screen.getByLabelText("Kode kelas"), { target: { value: "VII-A" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Aktif" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(screen.getByText("Kirana Putri")).toBeInTheDocument();
    expect(screen.getByText("Data berhasil ditambahkan.")).toBeInTheDocument();

    rerender(<AdminPanel onNavigate={() => undefined} route="teachers" />);
    expect(screen.queryByText("Data berhasil ditambahkan.")).not.toBeInTheDocument();

    rerender(<AdminPanel onNavigate={() => undefined} route="students" />);
    expect(screen.getByText("Data berhasil ditambahkan.")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText("Data berhasil ditambahkan.")).not.toBeInTheDocument();
  });

  it("membuka rekap nilai dari dashboard admin", () => {
    const onNavigate = vi.fn();
    render(<AdminPanel onNavigate={onNavigate} route="dashboard" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Lihat Nilai" })[0]);

    expect(onNavigate).toHaveBeenCalledWith("grades");
  });

  it("mengunduh template Excel siswa yang dapat diisi lalu diimpor", async () => {
    window.localStorage.removeItem("sipena.accessToken");
    const headers = [
      "NIS",
      "NISN",
      "Nama Lengkap",
      "Jenis Kelamin (L/P)",
      "Kode Kelas",
      "Status",
    ];
    spreadsheetMocks.downloadSpreadsheet.mockResolvedValue(undefined);
    spreadsheetMocks.readSpreadsheetFile.mockResolvedValue([
      headers,
      ["2026012", "0123456712", "Mawar Putri", "P", "VII-A", "Aktif"],
    ]);

    render(<AdminPanel onNavigate={() => undefined} route="students" />);

    fireEvent.click(screen.getByRole("button", { name: "Template XLSX" }));
    await waitFor(() => {
      expect(spreadsheetMocks.downloadSpreadsheet).toHaveBeenCalledWith(
        "template-data-siswa-sipena.xlsx",
        [headers],
        "Data Siswa",
      );
    });
    expect(await screen.findByText("Template data siswa berhasil diunduh.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Impor data siswa"), {
      target: { files: [new File(["xlsx"], "data-siswa.xlsx")] },
    });
    expect(await screen.findByText("Mawar Putri")).toBeInTheDocument();
  });

  it("menyediakan template, impor, dan ekspor untuk entitas admin lainnya", async () => {
    window.localStorage.removeItem("sipena.accessToken");
    const headers = ["NIP", "Nama Lengkap", "Jenis Kelamin (L/P)", "Email", "Status"];
    spreadsheetMocks.downloadSpreadsheet.mockResolvedValue(undefined);
    spreadsheetMocks.readSpreadsheetFile.mockResolvedValue([
      headers,
      ["198601012015011009", "Dewi Anggraini", "P", "dewi@sekolah.sch.id", "Aktif"],
    ]);

    render(<AdminPanel onNavigate={() => undefined} route="teachers" />);

    fireEvent.click(screen.getByRole("button", { name: "Template XLSX" }));
    await waitFor(() => {
      expect(spreadsheetMocks.downloadSpreadsheet).toHaveBeenCalledWith(
        "template-data-guru-sipena.xlsx",
        [headers],
        "Data Guru",
      );
    });

    fireEvent.change(screen.getByLabelText("Impor data guru"), {
      target: { files: [new File(["xlsx"], "data-guru.xlsx")] },
    });
    expect(await screen.findByText("Dewi Anggraini")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ekspor" }));
    await waitFor(() => {
      expect(spreadsheetMocks.downloadSpreadsheet).toHaveBeenLastCalledWith(
        "data-guru-sipena.xlsx",
        expect.arrayContaining([headers, expect.arrayContaining(["198601012015011009", "Dewi Anggraini"])]),
        "Data Guru",
      );
    });
  });

  it("memuat overview backend dan menyimpan siswa baru ke endpoint CRUD", async () => {
    window.localStorage.setItem("sipena.accessToken", "token-admin");
    const createdStudent = {
      id: "102",
      nis: "2026011",
      nisn: "0123456711",
      name: "Nadia Lestari",
      gender: "P",
      className: "VII-A",
      status: "Aktif",
    };
    let studentsList = [...overviewPayload.data.students];

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/admin/overview")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: { ...overviewPayload.data, students: studentsList },
          }),
        });
      }
      if (url.endsWith("/v1/siswa") && init?.method === "POST") {
        studentsList = [...studentsList, createdStudent];
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            message: "Data siswa berhasil ditambahkan.",
            data: createdStudent,
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPanel onNavigate={() => undefined} route="students" />);

    expect(await screen.findByText("Andi Pratama")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Integrasi endpoint backend belum tersedia/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tambah siswa/i }));
    fireEvent.change(screen.getByLabelText("NIS"), { target: { value: "2026011" } });
    fireEvent.change(screen.getByLabelText("NISN"), { target: { value: "0123456711" } });
    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Nadia Lestari" } });
    fireEvent.change(screen.getByLabelText("Jenis kelamin"), { target: { value: "P" } });
    fireEvent.change(screen.getByLabelText("Kode kelas"), { target: { value: "VII-A" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Aktif" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/siswa",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("Nadia Lestari")).toBeInTheDocument();
  });

  it("memuat rekap nilai kelas dari endpoint backend pada halaman grades", async () => {
    window.localStorage.setItem("sipena.accessToken", "token-admin");
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/admin/overview")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => overviewPayload,
        });
      }
      if (url.includes("/v1/kelas/") && url.endsWith("/rekap")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              class: overviewPayload.data.classes[0],
              subjects: [{ id: "501", code: "MAT", name: "Matematika" }],
              students: [
                {
                  id: "101",
                  nis: "2026001",
                  nisn: "0123456701",
                  name: "Andi Pratama",
                  scores: { "501": 91.5 },
                },
              ],
            },
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPanel onNavigate={() => undefined} route="grades" />);

    expect(await screen.findByText("Nilai akhir semester 91.50")).toBeInTheDocument();
    expect(
      screen.queryByText(/Nilai rapor dimuat langsung dari database SIPENA/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("mengunduh template, mengimpor, dan mengekspor data guru", async () => {
    window.localStorage.removeItem("sipena.accessToken");
    const headers = [
      "NIP",
      "Nama Lengkap",
      "Jenis Kelamin (L/P)",
      "Email",
      "Status",
    ];
    spreadsheetMocks.downloadSpreadsheet.mockResolvedValue(undefined);
    spreadsheetMocks.readSpreadsheetFile.mockResolvedValue([
      headers,
      ["199104122018012004", "Lailatul Munawaroh,S.Pd", "P", "lailatul@guru.smp.belajar.id", "Aktif"],
    ]);

    render(<AdminPanel onNavigate={() => undefined} route="teachers" />);

    fireEvent.click(screen.getByRole("button", { name: "Template XLSX" }));
    await waitFor(() => {
      expect(spreadsheetMocks.downloadSpreadsheet).toHaveBeenCalledWith(
        "template-data-guru-sipena.xlsx",
        [headers],
        "Data Guru",
      );
    });
    expect(await screen.findByText("Template data guru berhasil diunduh.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Impor data guru"), {
      target: { files: [new File(["xlsx"], "data-guru.xlsx")] },
    });
    expect(await screen.findByText("Lailatul Munawaroh,S.Pd")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ekspor" }));
    await waitFor(() => {
      expect(spreadsheetMocks.downloadSpreadsheet).toHaveBeenCalledWith(
        "data-guru-sipena.xlsx",
        expect.arrayContaining([headers]),
        "Data Guru",
      );
    });
  });

  it("mengurutkan dropdown periode ganjil-genap per tahun dan mengosongkan data saat pindah ke periode baru", () => {
    window.localStorage.removeItem("sipena.accessToken");
    const { rerender } = render(<AdminPanel onNavigate={() => undefined} route="dashboard" />);

    fireEvent.change(screen.getByLabelText("Tahun ajaran baru"), {
      target: { value: "2027/2028" },
    });
    fireEvent.change(screen.getByLabelText("Semester periode baru"), {
      target: { value: "Ganjil" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Tambah & Aktifkan/i }));

    fireEvent.change(screen.getByLabelText("Tahun ajaran baru"), {
      target: { value: "2026/2027" },
    });
    fireEvent.change(screen.getByLabelText("Semester periode baru"), {
      target: { value: "Genap" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Tambah & Aktifkan/i }));

    const periodSelect = screen.getByLabelText("Pilih periode aktif") as HTMLSelectElement;
    const optionValues = Array.from(periodSelect.options).map((opt) => opt.value);
    expect(optionValues).toEqual([
      "2026/2027 · Ganjil",
      "2026/2027 · Genap",
      "2027/2028 · Ganjil",
    ]);

    rerender(<AdminPanel onNavigate={() => undefined} route="students" />);
    expect(screen.getByText("Data tidak ditemukan.")).toBeInTheDocument();

    rerender(<AdminPanel onNavigate={() => undefined} route="teachers" />);
    expect(screen.getByText("Data tidak ditemukan.")).toBeInTheDocument();

    rerender(<AdminPanel onNavigate={() => undefined} route="classes" />);
    expect(screen.getByText("Data tidak ditemukan.")).toBeInTheDocument();
  });

  it("memfilter dan mengurutkan kelas pada halaman pembagian tugas guru", () => {
    window.localStorage.removeItem("sipena.accessToken");
    render(<AdminPanel onNavigate={() => undefined} route="assignments" />);

    const orderSelect = screen.getByLabelText("Urutan kelas");
    fireEvent.change(orderSelect, { target: { value: "desc" } });
    const rowsDesc = screen.getAllByRole("row").slice(1);
    expect(rowsDesc[0]).toHaveTextContent("VIII-A");

    const classFilter = screen.getByLabelText("Filter kelas");
    fireEvent.change(classFilter, { target: { value: "VII-B" } });
    expect(screen.getByText("Bahasa Indonesia")).toBeInTheDocument();
    expect(screen.queryByText("Matematika")).not.toBeInTheDocument();
  });

  it("menghindari data contoh sebelum pemuatan dan memperbarui dashboard berkala", async () => {
    window.localStorage.setItem("sipena.accessToken", "token-admin");
    vi.useFakeTimers();
    let students = [...overviewPayload.data.students];
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: { ...overviewPayload.data, students },
        }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPanel onNavigate={() => undefined} route="dashboard" />);

    expect(screen.getAllByText("...")).toHaveLength(4);
    expect(screen.queryByText("8")).not.toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Total Siswa").parentElement?.querySelector("strong")).toHaveTextContent("1");

    students = [
      ...students,
      {
        ...overviewPayload.data.students[0],
        id: "102",
        nis: "2026002",
        name: "Nadia Lestari",
      },
    ];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(screen.getByText("Total Siswa").parentElement?.querySelector("strong")).toHaveTextContent("2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
