import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { getStoredAccessToken, login } from "../Login/auth";
import "./AdminPanel.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const endpointByRoute: Record<AdminRoute, string> = {
  academic: "/v1/periode",
  grades: "/v1/rentang-nilai",
  subjects: "/v1/mapel",
  classes: "/v1/kelas",
  teachers: "/v1/guru",
  students: "/v1/siswa",
  assignments: "/v1/pengajaran",
};

type AdminRoute =
  | "academic"
  | "grades"
  | "subjects"
  | "classes"
  | "teachers"
  | "students"
  | "assignments";

type AdminRecord = Record<string, string>;

interface AdminField {
  key: string;
  label: string;
  type?: "email" | "number" | "date" | "select" | "password";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

interface AdminSection {
  title: string;
  description: string;
  addLabel: string;
  columns: { key: string; label: string }[];
  fields: AdminField[];
  searchKeys: string[];
}

type RecordSet = Record<AdminRoute, AdminRecord[]>;

const activePeriod = "2026/2027 · Ganjil";

const sectionConfig: Record<AdminRoute, AdminSection> = {
  academic: {
    title: "Periode Akademik",
    description: "Atur tahun ajaran dan semester yang digunakan sekolah.",
    addLabel: "Tambah periode",
    columns: [
      { key: "name", label: "Nama Periode" },
      { key: "startDate", label: "Tanggal Mulai" },
      { key: "endDate", label: "Tanggal Selesai" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "name", label: "Tahun ajaran dan semester" },
      { key: "startDate", label: "Tanggal mulai", type: "date" },
      { key: "endDate", label: "Tanggal selesai", type: "date" },
      { key: "status", label: "Status periode", type: "select", options: ["Aktif", "Tidak aktif"] },
    ],
    searchKeys: ["name", "status"],
  },
  grades: {
    title: "Rentang Nilai",
    description: "Tentukan predikat dan batas nilai untuk periode akademik aktif.",
    addLabel: "Tambah rentang",
    columns: [
      { key: "grade", label: "Predikat" },
      { key: "lower", label: "Nilai Minimum" },
      { key: "upper", label: "Nilai Maksimum" },
      { key: "description", label: "Keterangan" },
    ],
    fields: [
      { key: "grade", label: "Predikat" },
      { key: "lower", label: "Nilai minimum", type: "number", min: 0, max: 100, step: 0.01 },
      { key: "upper", label: "Nilai maksimum", type: "number", min: 0, max: 100, step: 0.01 },
      { key: "description", label: "Keterangan" },
    ],
    searchKeys: ["grade", "description"],
  },
  subjects: {
    title: "Mata Pelajaran",
    description: "Kelola daftar mata pelajaran dan KKM standar sekolah.",
    addLabel: "Tambah mata pelajaran",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Mata Pelajaran" },
      { key: "group", label: "Kelompok" },
      { key: "kkm", label: "KKM" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "code", label: "Kode mata pelajaran" },
      { key: "name", label: "Nama mata pelajaran" },
      { key: "group", label: "Kelompok", type: "select", options: ["Umum", "Muatan Lokal", "Kejuruan"] },
      { key: "kkm", label: "KKM standar", type: "number", min: 0, max: 100, step: 0.01 },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Tidak aktif"] },
    ],
    searchKeys: ["code", "name", "group"],
  },
  classes: {
    title: "Data Kelas",
    description: "Kelola rombongan belajar dan wali kelas pada periode aktif.",
    addLabel: "Tambah kelas",
    columns: [
      { key: "code", label: "Kode Kelas" },
      { key: "name", label: "Nama Kelas" },
      { key: "level", label: "Tingkat" },
      { key: "homeroom", label: "Wali Kelas" },
      { key: "period", label: "Periode" },
      { key: "students", label: "Jumlah Siswa" },
    ],
    fields: [
      { key: "code", label: "Kode kelas" },
      { key: "name", label: "Nama kelas" },
      { key: "level", label: "Tingkat", type: "select", options: ["VII", "VIII", "IX"] },
      { key: "homeroom", label: "Wali kelas", type: "select" },
      { key: "period", label: "Periode akademik", type: "select" },
    ],
    searchKeys: ["code", "name", "level", "homeroom"],
  },
  teachers: {
    title: "Data Guru",
    description: "Kelola profil guru, akun login, dan reset kata sandi (default awal: guru12345).",
    addLabel: "Tambah guru",
    columns: [
      { key: "nip", label: "NIP" },
      { key: "name", label: "Nama Guru" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "nip", label: "NIP" },
      { key: "name", label: "Nama lengkap" },
      { key: "gender", label: "Jenis kelamin", type: "select", options: ["L", "P"] },
      { key: "email", label: "Email akun", type: "email" },
      { key: "status", label: "Status akun", type: "select", options: ["Aktif", "Tidak aktif"] },
      {
        key: "password",
        label: "Kata sandi akun (opsional)",
        type: "password",
        required: false,
        placeholder: "Kosongkan = default guru12345 (min. 8 karakter jika diisi)",
      },
    ],
    searchKeys: ["nip", "name", "email"],
  },
  students: {
    title: "Data Siswa",
    description: "Kelola siswa dan keanggotaan kelas untuk periode aktif.",
    addLabel: "Tambah siswa",
    columns: [
      { key: "nis", label: "NIS" },
      { key: "name", label: "Nama Siswa" },
      { key: "className", label: "Kelas" },
      { key: "gender", label: "L/P" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "nis", label: "NIS" },
      { key: "nisn", label: "NISN" },
      { key: "name", label: "Nama lengkap" },
      { key: "gender", label: "Jenis kelamin", type: "select", options: ["L", "P"] },
      { key: "className", label: "Kode kelas", type: "select" },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Lulus", "Pindah", "Nonaktif"] },
    ],
    searchKeys: ["nis", "nisn", "name", "className"],
  },
  assignments: {
    title: "Pembagian Tugas Guru",
    description: "Plot guru, mata pelajaran, kelas, pantau progres nilai, serta kunci/buka pengisian nilai.",
    addLabel: "Tambah penugasan",
    columns: [
      { key: "teacher", label: "Guru" },
      { key: "subject", label: "Mata Pelajaran" },
      { key: "className", label: "Kelas" },
      { key: "period", label: "Periode" },
      { key: "kkm", label: "KKM" },
      { key: "progress", label: "Progres Nilai" },
      { key: "lockStatus", label: "Status Nilai" },
    ],
    fields: [
      { key: "teacher", label: "Guru", type: "select" },
      { key: "subject", label: "Mata pelajaran", type: "select" },
      { key: "className", label: "Kelas", type: "select" },
      { key: "period", label: "Periode", type: "select" },
      { key: "kkm", label: "KKM pengajaran", type: "number", min: 0, max: 100, step: 0.01 },
    ],
    searchKeys: ["teacher", "subject", "className", "period"],
  },
};

const emptyRecords: RecordSet = {
  academic: [],
  grades: [],
  subjects: [],
  classes: [],
  teachers: [],
  students: [],
  assignments: [],
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (character === "," || character === ";")) {
      row.push(value.trim());
      value = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

async function downloadSpreadsheet(filename: string, rows: string[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
  XLSX.writeFile(workbook, filename);
}

interface AdminPanelProps {
  route: string;
  onNavigate: (route: string) => void;
}

function AdminPanel({ route, onNavigate }: AdminPanelProps) {
  const [records, setRecords] = useState<RecordSet>(emptyRecords);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendSynced, setIsBackendSynced] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Semua Kelas");
  const [selectedStatus, setSelectedStatus] = useState("Semua Status");
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState("Periode Aktif");
  const [dialogMode, setDialogMode] = useState<
    "create" | "edit" | "details" | "reset-password" | "copy-period" | null
  >(null);
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function ensureAdminAccessToken(forceRefresh = false): Promise<string | null> {
    const existing = getStoredAccessToken();
    if (existing && !forceRefresh) {
      return existing;
    }
    if (import.meta.env.DEV) {
      try {
        const result = await login({ email: "test@example.com", password: "password" }, true);
        return result.accessToken;
      } catch {
        return null;
      }
    }
    return null;
  }

  async function refreshOverview() {
    let token = await ensureAdminAccessToken();
    if (!token) {
      setIsBackendSynced(false);
      setIsLoading(false);
      setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak merespons. Silakan login kembali.");
      return;
    }
    try {
      let response = await fetch(`${apiBaseUrl}/v1/admin/overview`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401 && import.meta.env.DEV) {
        token = await ensureAdminAccessToken(true);
        if (token) {
          response = await fetch(`${apiBaseUrl}/v1/admin/overview`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }
      }
      if (!response.ok) {
        setIsBackendSynced(false);
        setNotice("Gagal memuat data dari server backend. Silakan muat ulang halaman.");
        return;
      }
      const payload = (await response.json()) as { data?: RecordSet };
      if (payload?.data) {
        setRecords(payload.data);
        setIsBackendSynced(true);
      }
    } catch {
      setIsBackendSynced(false);
      setNotice("Tidak dapat terhubung ke server backend. Pastikan server backend (php artisan serve) sedang aktif.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshOverview();
  }, []);

  const currentRoute: AdminRoute | null = Object.prototype.hasOwnProperty.call(sectionConfig, route)
    ? (route as AdminRoute)
    : null;
  const section = currentRoute ? sectionConfig[currentRoute] : null;
  const rows = currentRoute ? records[currentRoute] : [];
  const currentPeriod = records.academic.find((record) => record.status === "Aktif")?.name ?? activePeriod;
  const effectivePeriodFilter =
    selectedPeriodFilter === "Periode Aktif" ? currentPeriod : selectedPeriodFilter;
  const visibleRows = useMemo(() => {
    if (!section) return [];
    const query = search.trim().toLocaleLowerCase("id");
    return rows.filter((record) => {
      const matchesSearch =
        !query || section.searchKeys.some((key) => record[key]?.toLocaleLowerCase("id").includes(query));
      const matchesStudentClass =
        currentRoute !== "students" || selectedClass === "Semua Kelas" || record.className === selectedClass;
      const matchesStudentStatus =
        currentRoute !== "students" || selectedStatus === "Semua Status" || record.status === selectedStatus;
      const matchesPeriod =
        (currentRoute !== "classes" && currentRoute !== "assignments" && currentRoute !== "grades") ||
        effectivePeriodFilter === "Semua Periode" ||
        !record.period ||
        record.period === effectivePeriodFilter;
      return matchesSearch && matchesStudentClass && matchesStudentStatus && matchesPeriod;
    });
  }, [currentRoute, effectivePeriodFilter, rows, search, section, selectedClass, selectedStatus]);

  function navigate(nextRoute: string) {
    setSearch("");
    setSelectedClass("Semua Kelas");
    setSelectedStatus("Semua Status");
    setSelectedPeriodFilter("Periode Aktif");
    setNotice("");
    onNavigate(nextRoute);
  }

  function openForm(
    mode: "create" | "edit" | "details" | "reset-password" | "copy-period",
    record: AdminRecord | null = null,
  ) {
    setSelectedRecord(record);
    setDialogMode(mode);
    setFormError("");
  }

  function closeForm() {
    setDialogMode(null);
    setSelectedRecord(null);
    setFormError("");
  }

  function validateRecord(candidate: AdminRecord): string {
    if (!currentRoute) return "Halaman tidak ditemukan.";
    const existing = records[currentRoute].filter((record) => record.id !== selectedRecord?.id);

    if (currentRoute === "academic") {
      if (candidate.startDate && candidate.endDate && candidate.endDate <= candidate.startDate) {
        return "Tanggal selesai harus setelah tanggal mulai.";
      }
      if (dialogMode === "edit" && selectedRecord?.status === "Aktif" && candidate.status === "Tidak aktif") {
        return "Periode aktif tidak dapat dinonaktifkan secara langsung. Aktifkan periode lain terlebih dahulu.";
      }
      if (existing.some((record) => record.name.toLocaleLowerCase("id") === candidate.name.toLocaleLowerCase("id"))) {
        return "Nama periode sudah terdaftar.";
      }
    }

    if (currentRoute === "grades") {
      const lower = Number(candidate.lower);
      const upper = Number(candidate.upper);
      if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower < 0 || upper > 100 || lower > upper) {
        return "Rentang nilai harus berada pada 0–100 dan nilai minimum tidak boleh melebihi maksimum.";
      }
      const targetPeriod = selectedRecord?.period || currentPeriod;
      const periodExisting = existing.filter((record) => !record.period || record.period === targetPeriod);
      if (periodExisting.some((record) => record.grade.toUpperCase() === candidate.grade.toUpperCase())) {
        return "Predikat tersebut sudah digunakan.";
      }
      const overlaps = periodExisting.some((record) => {
        const otherLower = Number(record.lower);
        const otherUpper = Number(record.upper);
        return lower <= otherUpper && upper >= otherLower;
      });
      if (overlaps) return "Rentang nilai tidak boleh tumpang tindih dengan predikat lain.";

      if (dialogMode === "edit" || periodExisting.length >= 3) {
        const combined = [
          ...periodExisting.map((r) => ({
            grade: r.grade,
            lower: Number(r.lower),
            upper: Number(r.upper),
          })),
          { grade: candidate.grade.toUpperCase(), lower, upper },
        ].sort((a, b) => a.lower - b.lower);

        for (let i = 1; i < combined.length; i += 1) {
          const prev = combined[i - 1];
          const curr = combined[i];
          if (curr.lower - prev.upper > 1.0) {
            return `Rentang nilai tidak boleh menyisakan celah nilai antara predikat ${prev.grade} (${prev.upper}) dan ${curr.grade} (${curr.lower}).`;
          }
        }
      }
    }

    if (currentRoute === "subjects") {
      if (Number(candidate.kkm) < 0 || Number(candidate.kkm) > 100) {
        return "KKM harus berada pada rentang 0–100.";
      }
      if (existing.some((record) =>
        record.code.toLocaleLowerCase("id") === candidate.code.toLocaleLowerCase("id") ||
        record.name.toLocaleLowerCase("id") === candidate.name.toLocaleLowerCase("id")
      )) {
        return "Kode atau nama mata pelajaran sudah terdaftar.";
      }
    }

    if (currentRoute === "teachers") {
      if (candidate.password && candidate.password.length < 8) {
        return "Kata sandi akun guru minimal 8 karakter.";
      }
      if (existing.some((record) =>
        record.nip === candidate.nip ||
        record.email.toLocaleLowerCase("id") === candidate.email.toLocaleLowerCase("id")
      )) {
        return "NIP atau email guru sudah terdaftar.";
      }
    }

    if (currentRoute === "students") {
      if (existing.some((record) => record.nis === candidate.nis || record.nisn === candidate.nisn)) {
        return "NIS atau NISN sudah terdaftar.";
      }
      if (!records.classes.some((record) => record.code === candidate.className && record.period === currentPeriod)) {
        return "Pilih kelas yang terdaftar pada periode aktif.";
      }
    }

    if (currentRoute === "classes") {
      if (existing.some((record) =>
        record.code.toLocaleLowerCase("id") === candidate.code.toLocaleLowerCase("id") &&
        record.period === candidate.period
      )) {
        return "Kode kelas sudah terdaftar pada periode tersebut.";
      }
    }

    if (currentRoute === "assignments") {
      if (Number(candidate.kkm) < 0 || Number(candidate.kkm) > 100) {
        return "KKM pengajaran harus berada pada rentang 0–100.";
      }
      if (!records.teachers.some((record) => record.name === candidate.teacher)) {
        return "Pilih guru yang terdaftar.";
      }
      if (!records.subjects.some((record) => record.name === candidate.subject)) {
        return "Pilih mata pelajaran yang terdaftar.";
      }
      if (!records.classes.some((record) => record.name === candidate.className && record.period === candidate.period)) {
        return "Pilih kelas yang terdaftar pada periode penugasan.";
      }
      if (existing.some((record) =>
        record.teacher === candidate.teacher &&
        record.subject === candidate.subject &&
        record.className === candidate.className &&
        record.period === candidate.period,
      )) {
        return "Penugasan guru, mata pelajaran, kelas, dan periode tersebut sudah ada.";
      }
    }
    return "";
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentRoute || !section) return;
    const formData = new FormData(event.currentTarget);
    const candidate: AdminRecord = Object.fromEntries(
      section.fields.map((field) => [field.key, String(formData.get(field.key) ?? "").trim()]),
    );
    const validationMessage = validateRecord(candidate);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    let token = await ensureAdminAccessToken();
    if (!token) {
      setFormError("Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Silakan login kembali.");
      return;
    }

    try {
      const endpoint = endpointByRoute[currentRoute];
      const url =
        dialogMode === "edit" && selectedRecord
          ? `${apiBaseUrl}${endpoint}/${selectedRecord.id}`
          : `${apiBaseUrl}${endpoint}`;
      let response = await fetch(url, {
        method: dialogMode === "edit" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(candidate),
      });
      if (response.status === 401 && import.meta.env.DEV) {
        token = await ensureAdminAccessToken(true);
        if (token) {
          response = await fetch(url, {
            method: dialogMode === "edit" ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(candidate),
          });
        }
      }
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setFormError(payload?.message ?? "Gagal menyimpan data ke server backend.");
        return;
      }
      await refreshOverview();
      setNotice(payload?.message ?? (dialogMode === "edit" ? "Perubahan berhasil disimpan." : "Data berhasil ditambahkan."));
      closeForm();
    } catch {
      setFormError("Tidak dapat terhubung ke server backend. Data tidak disimpan.");
    }
  }

  async function resetTeacherPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRecord) return;
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("password") ?? "").trim() || "guru12345";

    if (newPassword.length < 8) {
      setFormError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    let token = await ensureAdminAccessToken();
    if (!token) {
      setFormError("Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Silakan login kembali.");
      return;
    }

    try {
      let response = await fetch(`${apiBaseUrl}/v1/guru/${selectedRecord.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      if (response.status === 401 && import.meta.env.DEV) {
        token = await ensureAdminAccessToken(true);
        if (token) {
          response = await fetch(`${apiBaseUrl}/v1/guru/${selectedRecord.id}/reset-password`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ password: newPassword }),
          });
        }
      }
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setFormError(payload?.message ?? "Gagal mereset kata sandi guru di server.");
        return;
      }
      await refreshOverview();
      setNotice(
        payload?.message ??
          `Kata sandi akun ${selectedRecord.name} (${selectedRecord.email}) berhasil direset menjadi: ${newPassword}`,
      );
      closeForm();
    } catch {
      setFormError("Tidak dapat terhubung ke server backend. Kata sandi tidak direset.");
    }
  }

  async function copyPeriodData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRecord) return;
    const formData = new FormData(event.currentTarget);
    const sourcePeriod = String(formData.get("source_period") ?? "").trim();
    const mode = String(formData.get("mode") ?? "same_class").trim();

    if (!sourcePeriod || sourcePeriod === selectedRecord.name) {
      setFormError("Pilih periode sumber yang berbeda dari periode tujuan.");
      return;
    }

    const token = await ensureAdminAccessToken();
    if (!token) {
      setFormError("Sesi autentikasi tidak ditemukan atau server backend tidak aktif.");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/v1/periode/${selectedRecord.id}/copy-from`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source_period: sourcePeriod,
          mode,
          copy_assignments: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setFormError(payload?.message ?? "Gagal menyalin atau mempromosikan data kelas dari periode sumber.");
        return;
      }
      await refreshOverview();
      setNotice(payload?.message ?? "Transisi kelas dan siswa berhasil disinkronkan.");
      closeForm();
    } catch {
      setFormError("Tidak dapat terhubung ke server backend. Transisi periode dibatalkan.");
    }
  }

  async function deleteRecord(record: AdminRecord) {
    if (!currentRoute) return;
    if (currentRoute === "academic" && record.status === "Aktif") {
      setNotice("Periode aktif tidak dapat dihapus. Aktifkan periode lain terlebih dahulu.");
      return;
    }
    const hasReferences =
      (currentRoute === "academic" &&
        (records.classes.some((item) => item.period === record.name) ||
          records.assignments.some((item) => item.period === record.name))) ||
      (currentRoute === "classes" &&
        (records.students.some((item) => item.className === record.code) ||
          records.assignments.some((item) => item.className === record.name))) ||
      (currentRoute === "teachers" &&
        (records.classes.some((item) => item.homeroom === record.name) ||
          records.assignments.some((item) => item.teacher === record.name))) ||
      (currentRoute === "subjects" && records.assignments.some((item) => item.subject === record.name));
    if (hasReferences) {
      setNotice("Data masih digunakan oleh data akademik lain. Hapus atau pindahkan relasinya terlebih dahulu.");
      return;
    }
    if (!window.confirm(`Hapus data "${record.name ?? record.grade ?? record.code ?? record.nis ?? record.teacher ?? ""}"?`)) {
      return;
    }

    const token = await ensureAdminAccessToken();
    if (!token) {
      setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Data tidak dihapus.");
      return;
    }

    try {
      const endpoint = endpointByRoute[currentRoute];
      const response = await fetch(`${apiBaseUrl}${endpoint}/${record.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setNotice(payload?.message ?? "Data tidak dapat dihapus dari server.");
        return;
      }
      await refreshOverview();
      setNotice(payload?.message ?? "Data berhasil dihapus.");
    } catch {
      setNotice("Tidak dapat terhubung ke server backend. Data tidak dihapus.");
    }
  }

  async function exportStudents() {
    const headers = ["No", "NIS", "NISN", "Nama Lengkap", "Jenis Kelamin (L/P)", "Kode Kelas"];
    const dataRows = visibleRows.map((record, index) => [
      String(index + 1), record.nis, record.nisn, record.name, record.gender,
      record.className,
    ]);
    try {
      await downloadSpreadsheet("data-siswa-sipena.xlsx", [headers, ...dataRows]);
      setNotice("File Excel data siswa berhasil diunduh.");
    } catch (error) {
      console.error("Failed to export students.", error);
      setNotice("Data siswa tidak dapat diekspor. Silakan coba lagi.");
    }
  }

  async function downloadStudentTemplate() {
    try {
      await downloadSpreadsheet("template-impor-siswa.xlsx", [[
        "No", "NIS*", "NISN*", "Nama Lengkap*", "Jenis Kelamin (L/P)*", "Kode Kelas*",
      ]]);
      setNotice("Template impor siswa berhasil diunduh.");
    } catch (error) {
      console.error("Failed to export student template.", error);
      setNotice("Template tidak dapat diunduh. Silakan coba lagi.");
    }
  }

  async function importStudents(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setNotice("Ukuran file melebihi batas 5 MB.");
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setNotice("Format file tidak didukung. Pilih file .xlsx atau .csv.");
      return;
    }

    try {
      let parsedRows: string[][];
      if (file.name.toLowerCase().endsWith(".csv")) {
        parsedRows = parseCsv(await file.text());
      } else {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
          setNotice("File Excel tidak memiliki lembar kerja.");
          return;
        }
        parsedRows = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
          header: 1,
          defval: "",
          raw: false,
        });
      }
      if (parsedRows.length < 2) {
        setNotice("File tidak berisi data siswa.");
        return;
      }
      const headers = parsedRows[0].map((header) =>
        header.replace(/^\uFEFF/, "").replace(/\*/g, "").trim().toLocaleLowerCase("id"),
      );
      const findColumn = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const columns = {
        nis: findColumn("nis"),
        nisn: findColumn("nisn"),
        name: findColumn("nama lengkap", "nama", "name"),
        gender: findColumn("jenis kelamin (l/p)", "jenis kelamin", "gender"),
        className: findColumn("kode kelas", "kelas"),
      };
      if ([columns.nis, columns.nisn, columns.name, columns.gender, columns.className].some((column) => column < 0)) {
        setNotice("Header CSV tidak sesuai template impor siswa.");
        return;
      }

      const imported: AdminRecord[] = [];
      const errors: string[] = [];
      const usedNis = new Set(records.students.map((record) => record.nis));
      const usedNisn = new Set(records.students.map((record) => record.nisn));
      for (const [index, row] of parsedRows.slice(1).entries()) {
        const getValue = (column: number) => column < 0 ? "" : (row[column] ?? "").trim();
        const student: AdminRecord = {
          id: createId(),
          nis: getValue(columns.nis),
          nisn: getValue(columns.nisn),
          name: getValue(columns.name),
          gender: getValue(columns.gender).toUpperCase(),
          className: getValue(columns.className),
          status: "Aktif",
        };
        if (!student.nis || !student.nisn || !student.name || !student.className) {
          errors.push(`Baris ${index + 2}: NIS, NISN, nama, dan kode kelas wajib diisi.`);
        } else if (student.gender !== "L" && student.gender !== "P") {
          errors.push(`Baris ${index + 2}: jenis kelamin hanya boleh L atau P.`);
        } else if (!records.classes.some((record) =>
          record.code.toLocaleLowerCase("id") === student.className.toLocaleLowerCase("id") &&
          record.period === currentPeriod
        )) {
          errors.push(`Baris ${index + 2}: kode kelas tidak ditemukan pada periode aktif.`);
        } else if (usedNis.has(student.nis) || usedNisn.has(student.nisn)) {
          errors.push(`Baris ${index + 2}: NIS atau NISN sudah terdaftar/duplikat.`);
        } else {
          usedNis.add(student.nis);
          usedNisn.add(student.nisn);
          imported.push(student);
        }
      }

      if (errors.length) {
        setNotice(`Impor dibatalkan; tidak ada data disimpan. ${errors.slice(0, 3).join(" ")}`);
        return;
      }
      if (!imported.length) {
        setNotice("Tidak ada baris siswa yang dapat diimpor.");
        return;
      }
      const token = await ensureAdminAccessToken();
      if (!token) {
        setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Impor siswa dibatalkan.");
        return;
      }
      const response = await fetch(`${apiBaseUrl}/v1/siswa/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ students: imported }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setNotice(payload?.message ?? "Impor siswa ditolak oleh server.");
        return;
      }
      await refreshOverview();
      setNotice(payload?.message ?? `${imported.length} data siswa berhasil diimpor.`);
    } catch (error) {
      console.error("Failed to import student spreadsheet.", error);
      setNotice("Gagal mengimpor data siswa ke server backend. Periksa format file dan koneksi server.");
    }
  }

  if (!section || !currentRoute) {
    const activeCount = records.academic.filter((record) => record.status === "Aktif").length;
    const activeClasses = records.classes.filter((record) => record.period === currentPeriod);
    const activeClassCodes = new Set(activeClasses.map((record) => record.code));
    const activeStudentCount = records.students.filter((record) => activeClassCodes.has(record.className)).length;
    const activeAssignmentCount = records.assignments.filter((record) => record.period === currentPeriod).length;
    return (
      <div className="admin-panel">
        <section className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">SIPENA · ADMIN</span>
            <h1>Dashboard Admin</h1>
            <p>Ringkasan pengelolaan akademik sekolah.</p>
          </div>
          <span className="admin-active-period">{currentPeriod}</span>
        </section>
        <section className="admin-stat-grid" aria-label="Ringkasan data sekolah">
          <article className="admin-stat-card"><span>Periode Aktif</span><strong>{activeCount}</strong><small>Tahun ajaran berjalan</small></article>
          <article className="admin-stat-card"><span>Total Guru</span><strong>{records.teachers.length}</strong><small>{records.teachers.filter((record) => record.status === "Aktif").length} akun aktif</small></article>
          <article className="admin-stat-card"><span>Total Siswa</span><strong>{activeStudentCount}</strong><small>Data periode aktif</small></article>
          <article className="admin-stat-card"><span>Total Kelas</span><strong>{activeClasses.length}</strong><small>{activeAssignmentCount} penugasan mengajar</small></article>
        </section>
        <div className="admin-overview-grid">
          <section className="admin-overview-card">
            <div className="admin-section-heading"><div><h2>Persiapan akademik</h2><p>Kelola data utama untuk memulai periode.</p></div></div>
            <div className="admin-quick-links">
              {([
                ["academic", "Periode akademik", "Atur tahun ajaran dan semester"],
                ["grades", "Rentang nilai", "Tentukan batas predikat"],
                ["assignments", "Pembagian tugas guru", "Plot guru, kelas, dan mapel"],
              ] as const).map(([target, title, description]) => (
                <button key={target} onClick={() => navigate(target)} type="button">
                  <span className="admin-quick-icon" aria-hidden="true">{title.slice(0, 1)}</span>
                  <span><strong>{title}</strong><small>{description}</small></span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
          <section className="admin-overview-card">
            <div className="admin-section-heading"><div><h2>Data master</h2><p>Akses cepat ke data sekolah.</p></div></div>
            <div className="admin-master-grid">
              {([
                ["students", "Data Siswa", records.students.length],
                ["teachers", "Data Guru", records.teachers.length],
                ["classes", "Data Kelas", records.classes.length],
                ["subjects", "Mata Pelajaran", records.subjects.length],
              ] as const).map(([target, title, count]) => (
                <button key={target} onClick={() => navigate(target)} type="button">
                  <strong>{count}</strong><span>{title}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="admin-demo-notice" role="note">
          {isBackendSynced
            ? "Terhubung ke database PostgreSQL SIPENA — seluruh perubahan data langsung tersimpan ke server."
            : "Data pada halaman admin ini menggunakan data pratinjau lokal. Pastikan server backend aktif agar tersinkron ke database."}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">SIPENA · ADMIN</span>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>
        <span className="admin-active-period">{currentPeriod}</span>
      </section>

      {notice && <p className="admin-notice" role="status">{notice}</p>}

      <section className="admin-records-card" aria-label={section.title}>
        <div className="admin-records-toolbar">
          <label className="admin-search">
            <span className="visually-hidden">Cari {section.title.toLocaleLowerCase("id")}</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Cari ${section.title.toLocaleLowerCase("id")}...`}
              type="search"
              value={search}
            />
          </label>
          {currentRoute === "students" && (
            <div className="admin-student-filters">
              <label>
                <span className="visually-hidden">Filter kelas</span>
                <select onChange={(event) => setSelectedClass(event.target.value)} value={selectedClass}>
                  <option>Semua Kelas</option>
                  {records.classes
                    .filter((record) => record.period === currentPeriod)
                    .map((record) => <option key={record.id} value={record.code}>{record.code}</option>)}
                </select>
              </label>
              <label>
                <span className="visually-hidden">Filter status siswa</span>
                <select onChange={(event) => setSelectedStatus(event.target.value)} value={selectedStatus}>
                  <option>Semua Status</option>
                  <option>Aktif</option>
                  <option>Lulus</option>
                  <option>Pindah</option>
                  <option>Nonaktif</option>
                </select>
              </label>
            </div>
          )}
          {(currentRoute === "classes" || currentRoute === "assignments" || currentRoute === "grades") && (
            <div className="admin-student-filters">
              <label>
                <span className="visually-hidden">Filter periode akademik</span>
                <select
                  aria-label="Filter periode akademik"
                  onChange={(event) => setSelectedPeriodFilter(event.target.value)}
                  value={selectedPeriodFilter}
                >
                  <option value="Periode Aktif">Periode Aktif ({currentPeriod})</option>
                  <option value="Semua Periode">Semua Periode</option>
                  {records.academic.map((periodRecord) => (
                    <option key={periodRecord.id} value={periodRecord.name}>
                      {periodRecord.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {currentRoute === "students" && (
            <div className="admin-file-actions">
              <button className="admin-secondary-button" onClick={() => void downloadStudentTemplate()} type="button">Template XLSX</button>
              <label className="admin-secondary-button admin-file-button">
                Impor XLSX/CSV
                <input accept=".csv,.xlsx" onChange={(event) => void importStudents(event)} type="file" />
              </label>
              <button className="admin-secondary-button" onClick={() => void exportStudents()} type="button">Ekspor XLSX</button>
            </div>
          )}
          <button className="admin-primary-button" onClick={() => openForm("create")} type="button">+ {section.addLabel}</button>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {section.columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((record) => (
                <tr key={record.id}>
                  {section.columns.map((column) => (
                    <td key={column.key}>
                      {column.key === "status" ? (
                        <span className={`admin-status ${record[column.key] === "Aktif" ? "active" : "inactive"}`}>{record[column.key]}</span>
                      ) : column.key === "lockStatus" ? (
                        <span className={`admin-status ${record.lockStatus === "Terkunci" ? "inactive" : "active"}`}>
                          {record.lockStatus ?? "Terbuka"}
                        </span>
                      ) : currentRoute === "classes" && column.key === "students" ? (
                        records.students.filter((student) => student.className === record.code && student.status === "Aktif").length
                      ) : record[column.key] ?? "—"}
                    </td>
                  ))}
                  <td className="admin-row-actions">
                    <button aria-label={`Lihat ${section.title}: ${record.name ?? record.grade ?? record.code ?? record.nis ?? record.teacher ?? ""}`} onClick={() => openForm("details", record)} type="button">Detail</button>
                    <button onClick={() => openForm("edit", record)} type="button">Edit</button>
                    {currentRoute === "teachers" && (
                      <button onClick={() => openForm("reset-password", record)} type="button">Reset Sandi</button>
                    )}
                    {currentRoute === "academic" && records.academic.length > 1 && (
                      <button onClick={() => openForm("copy-period", record)} type="button">Transisi Kelas</button>
                    )}
                    {currentRoute === "assignments" && (
                      <button
                        onClick={() => {
                          void (async () => {
                            const token = await ensureAdminAccessToken();
                            if (!token) {
                              setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak aktif.");
                              return;
                            }
                            try {
                              const response = await fetch(`${apiBaseUrl}/v1/pengajaran/${record.id}/toggle-lock`, {
                                method: "PATCH",
                                headers: {
                                  Accept: "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                              });
                              const payload = (await response.json().catch(() => null)) as { message?: string } | null;
                              if (!response.ok) {
                                setNotice(payload?.message ?? "Gagal mengubah status kunci nilai.");
                                return;
                              }
                              await refreshOverview();
                              setNotice(payload?.message ?? "Status kunci pengajaran berhasil diperbarui.");
                            } catch {
                              setNotice("Tidak dapat terhubung ke server backend. Status kunci tidak diubah.");
                            }
                          })();
                        }}
                        type="button"
                      >
                        {record.lockStatus === "Terkunci" ? "Buka Kunci" : "Kunci Nilai"}
                      </button>
                    )}
                    <button className="danger" onClick={() => deleteRecord(record)} type="button">Hapus</button>
                    {currentRoute === "academic" && record.status !== "Aktif" && (
                      <button onClick={() => {
                        void (async () => {
                          const token = await ensureAdminAccessToken();
                          if (!token) {
                            setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak aktif.");
                            return;
                          }
                          try {
                            const response = await fetch(`${apiBaseUrl}/v1/periode/${record.id}/activate`, {
                              method: "PATCH",
                              headers: {
                                Accept: "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                            });
                            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
                            if (!response.ok) {
                              setNotice(payload?.message ?? "Gagal mengaktifkan periode akademik di server.");
                              return;
                            }
                            await refreshOverview();
                            setNotice(payload?.message ?? "Periode akademik aktif telah diperbarui.");
                          } catch {
                            setNotice("Tidak dapat terhubung ke server backend. Periode tidak diubah.");
                          }
                        })();
                      }} type="button">Aktifkan</button>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td className="admin-empty" colSpan={section.columns.length + 1}>
                    {isLoading ? "Memuat data dari database..." : "Data tidak ditemukan."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="admin-records-footer">
          <span>{search ? `${visibleRows.length} hasil ditemukan` : `${rows.length} data`}</span>
          {currentRoute === "students" && <span>Format .xlsx / .csv · Maksimal 5 MB</span>}
        </footer>
      </section>

      <div className="admin-demo-notice" role="note">
        {isLoading
          ? "Menghubungkan ke database PostgreSQL SIPENA..."
          : isBackendSynced
            ? "Terhubung ke database PostgreSQL SIPENA — perubahan tersimpan langsung ke server."
            : "Tidak terhubung ke server backend SIPENA. Pastikan server backend aktif agar data dapat dimuat dan disimpan."}
      </div>

      {dialogMode && (
        <div className="admin-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm();
        }}>
          <section aria-labelledby="admin-dialog-title" aria-modal="true" className="admin-dialog" role="dialog">
            <div className="admin-dialog-heading">
              <div>
                <span className="admin-eyebrow">{section.title}</span>
                <h2 id="admin-dialog-title">
                  {dialogMode === "create"
                    ? section.addLabel
                    : dialogMode === "edit"
                      ? `Edit ${section.title.toLocaleLowerCase("id")}`
                      : dialogMode === "reset-password"
                        ? "Reset Kata Sandi Akun Guru"
                        : dialogMode === "copy-period"
                          ? "Transisi & Promosi Kelas Antar Periode"
                          : `Detail ${section.title.toLocaleLowerCase("id")}`}
                </h2>
              </div>
              <button aria-label="Tutup" onClick={closeForm} type="button">×</button>
            </div>
            {dialogMode === "details" && selectedRecord ? (
              <dl className="admin-detail-list">
                {section.fields
                  .filter((field) => field.key !== "password")
                  .map((field) => (
                    <div key={field.key}><dt>{field.label}</dt><dd>{selectedRecord[field.key] || "—"}</dd></div>
                  ))}
                {currentRoute === "teachers" && (
                  <div>
                    <dt>Info Kata Sandi Login</dt>
                    <dd>Default awal: guru12345 (gunakan tombol Reset Sandi atau Edit untuk mengganti)</dd>
                  </div>
                )}
                {currentRoute === "assignments" && (
                  <>
                    <div>
                      <dt>Progres Input Nilai</dt>
                      <dd>{selectedRecord.progress || "0/0 siswa"}</dd>
                    </div>
                    <div>
                      <dt>Status Kunci Nilai</dt>
                      <dd>{selectedRecord.lockStatus || "Terbuka"}</dd>
                    </div>
                  </>
                )}
              </dl>
            ) : dialogMode === "reset-password" && selectedRecord ? (
              <form className="admin-form" onSubmit={resetTeacherPassword}>
                <dl className="admin-detail-list">
                  <div><dt>Nama Guru</dt><dd>{selectedRecord.name} (NIP: {selectedRecord.nip})</dd></div>
                  <div><dt>Email Login</dt><dd>{selectedRecord.email}</dd></div>
                </dl>
                <label>
                  Kata sandi baru (minimal 8 karakter)
                  <input
                    defaultValue="guru12345"
                    minLength={8}
                    name="password"
                    placeholder="Masukkan kata sandi baru (default: guru12345)"
                    required
                    type="text"
                  />
                </label>
                {formError && <p className="admin-form-error" role="alert">{formError}</p>}
                <div className="admin-dialog-actions">
                  <button className="admin-secondary-button" onClick={closeForm} type="button">Batal</button>
                  <button className="admin-primary-button" type="submit">Reset Kata Sandi</button>
                </div>
              </form>
            ) : dialogMode === "copy-period" && selectedRecord ? (
              <form className="admin-form" onSubmit={copyPeriodData}>
                <dl className="admin-detail-list">
                  <div><dt>Periode Tujuan</dt><dd>{selectedRecord.name}</dd></div>
                </dl>
                <label>
                  Salin data dari Periode Sumber
                  <select
                    defaultValue={
                      records.academic.find((item) => item.name !== selectedRecord.name && item.status === "Aktif")?.name ??
                      records.academic.find((item) => item.name !== selectedRecord.name)?.name ??
                      ""
                    }
                    name="source_period"
                    required
                  >
                    {records.academic
                      .filter((item) => item.name !== selectedRecord.name)
                      .map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name} ({item.status})
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Mode Transisi Kelas &amp; Siswa
                  <select defaultValue="same_class" name="mode" required>
                    <option value="same_class">
                      Transisi Semester (Salin kelas, siswa aktif &amp; penugasan ke kelas yang sama)
                    </option>
                    <option value="promote_level">
                      Promosi Kenaikan Tingkat (Naikkan siswa aktif VII → VIII dan VIII → IX)
                    </option>
                  </select>
                </label>
                {formError && <p className="admin-form-error" role="alert">{formError}</p>}
                <div className="admin-dialog-actions">
                  <button className="admin-secondary-button" onClick={closeForm} type="button">Batal</button>
                  <button className="admin-primary-button" type="submit">Proses Transisi</button>
                </div>
              </form>
            ) : (
              <form className="admin-form" onSubmit={saveRecord}>
                {section.fields.map((field) => {
                  const options = currentRoute === "classes" && field.key === "homeroom"
                    ? records.teachers.filter((record) => record.status === "Aktif").map((record) => record.name)
                    : currentRoute === "students" && field.key === "className"
                      ? records.classes.filter((record) => record.period === currentPeriod).map((record) => record.code)
                      : currentRoute === "assignments" && field.key === "teacher"
                        ? records.teachers.filter((record) => record.status === "Aktif").map((record) => record.name)
                        : currentRoute === "assignments" && field.key === "subject"
                          ? records.subjects.filter((record) => record.status === "Aktif").map((record) => record.name)
                          : currentRoute === "assignments" && field.key === "className"
                            ? records.classes.filter((record) => record.period === selectedRecord?.period || record.period === currentPeriod).map((record) => record.name)
                            : field.key === "period"
                              ? currentRoute === "assignments"
                                ? [currentPeriod]
                                : records.academic.map((record) => record.name)
                              : field.options;
                  const availableOptions = options
                    ? Array.from(new Set([...options, ...(selectedRecord?.[field.key] ? [selectedRecord[field.key]] : [])]))
                    : [];
                  return (
                    <label key={field.key}>
                      {field.label}
                      {field.type === "select" ? (
                        <select
                          defaultValue={selectedRecord?.[field.key] ?? (field.key === "period" ? currentPeriod : options?.[0])}
                          name={field.key}
                          required={field.required !== false}
                        >
                          {availableOptions.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input
                          defaultValue={field.key === "password" ? "" : (selectedRecord?.[field.key] ?? "")}
                          max={field.max}
                          min={field.min}
                          name={field.key}
                          placeholder={field.placeholder}
                          required={field.required !== false}
                          step={field.step}
                          type={field.type ?? "text"}
                        />
                      )}
                    </label>
                  );
                })}
                {formError && <p className="admin-form-error" role="alert">{formError}</p>}
                <div className="admin-dialog-actions">
                  <button className="admin-secondary-button" onClick={closeForm} type="button">Batal</button>
                  <button className="admin-primary-button" type="submit">Simpan</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
