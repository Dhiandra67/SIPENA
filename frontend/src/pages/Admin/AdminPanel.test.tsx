import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPanel from "./AdminPanel";

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

    expect(await screen.findByText(/Terhubung ke database SIPENA/i)).toBeInTheDocument();
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
      screen.getByText(/Nilai rapor dimuat langsung dari database SIPENA/i),
    ).toBeInTheDocument();
  });
});
