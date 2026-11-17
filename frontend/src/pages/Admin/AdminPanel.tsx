import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { downloadSpreadsheet, readSpreadsheetFile } from "../../lib/spreadsheet";
import { getStoredAccessToken } from "../Login/auth";
import {
  activePeriod,
  compareClassCodes,
  createId,
  derivePeriodDates,
  endpointByRoute,
  getFieldOptions,
  initialRecords,
  isAdminRoute,
  sections,
  sortPeriodNames,
  validateAdminRecord,
  type OverviewPayload,
  type RecordSet,
} from "./adminConfig";
import AdminFormDialog from "./AdminFormDialog";
import ClassDataPage from "./ClassDataPage";
import ClassGradesPage from "./ClassGradesPage";
import DashboardPage from "./DashboardPage";
import StudentDataPage from "./StudentDataPage";
import SubjectDataPage from "./SubjectDataPage";
import TeacherAssignmentsPage from "./TeacherAssignmentsPage";
import TeacherDataPage from "./TeacherDataPage";
import type { AdminRecord } from "./types";
import "./AdminPanel.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const studentSpreadsheetHeaders = [
  "NIS",
  "NISN",
  "Nama Lengkap",
  "Jenis Kelamin (L/P)",
  "Kode Kelas",
  "Status",
];
const teacherSpreadsheetHeaders = [
  "NIP",
  "Nama Lengkap",
  "Jenis Kelamin (L/P)",
  "Email",
  "Status",
];

interface AdminPanelProps {
  route: string;
  onNavigate: (route: string) => void;
}

function AdminPanel({ route, onNavigate }: AdminPanelProps) {
  const [records, setRecords] = useState<RecordSet>(initialRecords);
  const [academicPeriods, setAcademicPeriods] = useState<AdminRecord[]>([
    { id: "p1", name: activePeriod, status: "Aktif" },
  ]);
  const [currentPeriod, setCurrentPeriod] = useState(activePeriod);
  const [periodOptions, setPeriodOptions] = useState([activePeriod]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Semua Kelas");
  const [assignmentClassOrder, setAssignmentClassOrder] = useState<"asc" | "desc">("asc");
  const [selectedGradeClass, setSelectedGradeClass] = useState<AdminRecord | null>(
    initialRecords.classes[0],
  );
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "details" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNoticeState] = useState<{
    message: string;
    route: string;
    id: number;
  } | null>(null);
  const noticeId = useRef(0);

  function setNotice(message: string, noticeRoute = route) {
    if (!message) {
      setNoticeState(null);
      return;
    }

    noticeId.current += 1;
    setNoticeState({ message, route: noticeRoute, id: noticeId.current });
  }

  function applyOverviewData(data: OverviewPayload) {
    const names =
      Array.isArray(data.academic) && data.academic.length > 0
        ? sortPeriodNames(data.academic.map((period) => period.name))
        : [];
    const active =
      (Array.isArray(data.academic) && data.academic.length > 0
        ? data.academic.find((period) => period.status === "Aktif")?.name ?? names[0]
        : undefined) ?? activePeriod;

    const withDefaultPeriod = (items: AdminRecord[] = []) =>
      items.map((item) => (item.period === undefined ? { ...item, period: active } : item));

    const nextRecords: RecordSet = {
      students: withDefaultPeriod(data.students),
      teachers: withDefaultPeriod(data.teachers),
      classes: withDefaultPeriod(data.classes),
      subjects: withDefaultPeriod(data.subjects),
      assignments: withDefaultPeriod(data.assignments),
    };
    setRecords(nextRecords);

    if (Array.isArray(data.academic) && data.academic.length > 0) {
      setAcademicPeriods(data.academic);
      setPeriodOptions(names);
      setCurrentPeriod(active);
      setSelectedGradeClass((previous) => {
        if (previous) {
          const updated = nextRecords.classes.find(
            (item) =>
              (item.id === previous.id && item.period === active) ||
              (item.code === previous.code && item.period === active),
          );
          if (updated) return updated;
        }
        return nextRecords.classes.find((item) => item.period === active) ?? null;
      });
    } else if (nextRecords.classes.length > 0) {
      setSelectedGradeClass((previous) => {
        if (previous) {
          const updated = nextRecords.classes.find((item) => item.id === previous.id);
          if (updated) return updated;
        }
        return nextRecords.classes[0] ?? null;
      });
    }
  }

  async function refreshOverview(): Promise<boolean> {
    const token = getStoredAccessToken();
    if (!token) {
      return false;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/admin/overview`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        return false;
      }
      const payload = (await response.json().catch(() => null)) as { data?: OverviewPayload } | null;
      if (payload?.data) {
        applyOverviewData(payload.data);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshOverview();
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => {
      setNoticeState((current) => (current?.id === notice.id ? null : current));
    }, 10_000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const periodRecords = useMemo<RecordSet>(
    () => ({
      students: records.students.filter((item) => (item.period ?? activePeriod) === currentPeriod),
      teachers: records.teachers.filter((item) => (item.period ?? activePeriod) === currentPeriod),
      classes: records.classes.filter((item) => (item.period ?? activePeriod) === currentPeriod),
      subjects: records.subjects.filter((item) => (item.period ?? activePeriod) === currentPeriod),
      assignments: records.assignments.filter(
        (item) => (item.period ?? activePeriod) === currentPeriod,
      ),
    }),
    [currentPeriod, records],
  );

  const currentRoute = isAdminRoute(route) ? route : null;
  const section = currentRoute ? sections[currentRoute] : null;
  const rows = currentRoute ? periodRecords[currentRoute] : [];
  const visibleRows = useMemo(() => {
    if (!section || !currentRoute) return [];
    const query = search.trim().toLocaleLowerCase("id");
    const filtered = rows.filter((record) => {
      const matchesSearch =
        !query ||
        section.searchKeys.some((key) => record[key]?.toLocaleLowerCase("id").includes(query));
      const matchesClass =
        (currentRoute !== "students" && currentRoute !== "assignments") ||
        selectedClass === "Semua Kelas" ||
        record.className === selectedClass;
      return matchesSearch && matchesClass;
    });

    if (currentRoute === "assignments") {
      const direction = assignmentClassOrder === "desc" ? -1 : 1;
      return [...filtered].sort((a, b) => {
        const classDiff = compareClassCodes(a.className ?? "", b.className ?? "") * direction;
        if (classDiff !== 0) return classDiff;
        return (a.subject ?? "").localeCompare(b.subject ?? "", "id");
      });
    }

    if (currentRoute === "classes") {
      return [...filtered].sort((a, b) => compareClassCodes(a.code ?? "", b.code ?? ""));
    }

    return filtered;
  }, [assignmentClassOrder, currentRoute, rows, search, section, selectedClass]);

  function navigate(nextRoute: string) {
    setSearch("");
    setSelectedClass("Semua Kelas");
    setNotice("");
    onNavigate(nextRoute);
  }

  function openForm(mode: "create" | "edit" | "details", record: AdminRecord | null = null) {
    setSelectedRecord(record);
    setDialogMode(mode);
    setFormError("");
  }

  function closeForm() {
    setDialogMode(null);
    setSelectedRecord(null);
    setFormError("");
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentRoute || !section) return;
    const activeRouteSnapshot = currentRoute;
    const modeSnapshot = dialogMode;
    const editingRecord = selectedRecord;
    const formData = new FormData(event.currentTarget);
    const rawCandidate: AdminRecord = Object.fromEntries(
      section.fields.map((field) => [field.key, String(formData.get(field.key) ?? "").trim()]),
    );
    const candidate: AdminRecord = {
      ...rawCandidate,
      period: rawCandidate.period || currentPeriod,
    };
    const validationMessage = validateAdminRecord(
      candidate,
      currentRoute,
      section,
      periodRecords,
      selectedRecord,
    );
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const token = getStoredAccessToken();
    if (!token) {
      const record = { ...candidate, id: editingRecord?.id ?? createId() };
      setRecords((previous) => ({
        ...previous,
        [activeRouteSnapshot]:
          modeSnapshot === "edit"
            ? previous[activeRouteSnapshot].map((item) => (item.id === record.id ? record : item))
            : [...previous[activeRouteSnapshot], record],
      }));
      setNotice(
        modeSnapshot === "edit" ? "Perubahan berhasil disimpan." : "Data berhasil ditambahkan.",
      );
      closeForm();
      return;
    }

    try {
      const endpoint = endpointByRoute[activeRouteSnapshot];
      const url =
        modeSnapshot === "edit" && editingRecord
          ? `${apiBaseUrl}${endpoint}/${editingRecord.id}`
          : `${apiBaseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: modeSnapshot === "edit" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(candidate),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        data?: AdminRecord;
      } | null;
      if (!response.ok) {
        setFormError(payload?.message ?? "Gagal menyimpan data ke server backend.");
        return;
      }
      const refreshed = await refreshOverview();
      if (!refreshed) {
        const savedRecord: AdminRecord = payload?.data
          ? { ...payload.data, period: payload.data.period ?? candidate.period }
          : {
              ...candidate,
              id: editingRecord?.id ?? createId(),
            };
        setRecords((previous) => ({
          ...previous,
          [activeRouteSnapshot]:
            modeSnapshot === "edit"
              ? previous[activeRouteSnapshot].map((item) =>
                  item.id === savedRecord.id ? savedRecord : item,
                )
              : [...previous[activeRouteSnapshot], savedRecord],
        }));
      }
      setNotice(
        payload?.message ??
          (modeSnapshot === "edit" ? "Perubahan berhasil disimpan." : "Data berhasil ditambahkan."),
      );
      closeForm();
    } catch {
      setFormError("Tidak dapat terhubung ke server backend. Data tidak disimpan.");
    }
  }

  async function deleteRecord(record: AdminRecord) {
    if (!currentRoute) return;
    const activeRouteSnapshot = currentRoute;
    const inUse =
      (activeRouteSnapshot === "classes" &&
        (periodRecords.students.some((student) => student.className === record.code) ||
          periodRecords.assignments.some((assignment) => assignment.className === record.code))) ||
      (activeRouteSnapshot === "teachers" &&
        (periodRecords.classes.some((classRecord) => classRecord.homeroom === record.name) ||
          periodRecords.assignments.some((assignment) => assignment.teacher === record.name))) ||
      (activeRouteSnapshot === "subjects" &&
        periodRecords.assignments.some((assignment) => assignment.subject === record.name));
    if (inUse) {
      setNotice("Data masih digunakan. Hapus atau pindahkan relasinya terlebih dahulu.");
      return;
    }
    if (!window.confirm(`Hapus data "${record.name ?? record.code ?? record.nis ?? ""}"?`)) return;

    const token = getStoredAccessToken();
    if (!token) {
      setRecords((previous) => ({
        ...previous,
        [activeRouteSnapshot]: previous[activeRouteSnapshot].filter(
          (item) => !(item.id === record.id && (item.period ?? activePeriod) === currentPeriod),
        ),
      }));
      setNotice("Data berhasil dihapus.");
      return;
    }

    try {
      const endpoint = endpointByRoute[activeRouteSnapshot];
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
      const refreshed = await refreshOverview();
      if (!refreshed) {
        setRecords((previous) => ({
          ...previous,
          [activeRouteSnapshot]: previous[activeRouteSnapshot].filter(
            (item) => !(item.id === record.id && (item.period ?? activePeriod) === currentPeriod),
          ),
        }));
      }
      setNotice(payload?.message ?? "Data berhasil dihapus.");
    } catch {
      setNotice("Tidak dapat terhubung ke server backend. Data tidak dihapus.");
    }
  }

  async function selectPeriod(nextPeriod: string) {
    setCurrentPeriod(nextPeriod);
    setSelectedClass("Semua Kelas");
    setSelectedGradeClass(
      records.classes.find((item) => (item.period ?? activePeriod) === nextPeriod) ?? null,
    );
    setAcademicPeriods((previous) =>
      previous.map((item) => ({
        ...item,
        status: item.name === nextPeriod ? "Aktif" : "Tidak aktif",
      })),
    );
    const matchingRecord = academicPeriods.find((item) => item.name === nextPeriod);
    const token = getStoredAccessToken();
    if (!token || !matchingRecord?.id || matchingRecord.status === "Aktif") {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/v1/periode/${matchingRecord.id}/activate`, {
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
      setNotice(payload?.message ?? "Periode akademik berhasil diaktifkan.");
    } catch {
      setNotice("Tidak dapat terhubung ke server backend. Periode tidak dapat diaktifkan.");
    }
  }

  async function addPeriod(year: string, semester: string) {
    if (!/^\d{4}\/\d{4}$/.test(year)) {
      setNotice("Gunakan format tahun ajaran YYYY/YYYY.");
      return;
    }
    const period = `${year} · ${semester}`;
    if (periodOptions.includes(period)) {
      setNotice("Periode tersebut sudah terdaftar.");
      return;
    }

    const token = getStoredAccessToken();
    if (!token) {
      setPeriodOptions((previous) => sortPeriodNames([...previous, period]));
      setAcademicPeriods((previous) => [
        ...previous.map((item) => ({ ...item, status: "Tidak aktif" })),
        { id: createId(), name: period, status: "Aktif" },
      ]);
      setCurrentPeriod(period);
      setSelectedClass("Semua Kelas");
      setSelectedGradeClass(null);
      setNotice("Periode akademik berhasil ditambahkan dan diaktifkan.");
      return;
    }

    const { startDate, endDate } = derivePeriodDates(year, semester);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/periode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: period,
          tahun_ajaran: year,
          semester: semester.toUpperCase(),
          startDate,
          endDate,
          status: "Aktif",
          is_active: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        data?: AdminRecord;
      } | null;
      if (!response.ok) {
        setNotice(payload?.message ?? "Gagal menambahkan periode akademik di server.");
        return;
      }
      const refreshed = await refreshOverview();
      if (!refreshed) {
        setPeriodOptions((previous) => sortPeriodNames([...previous, period]));
        setCurrentPeriod(period);
        setSelectedClass("Semua Kelas");
        setSelectedGradeClass(null);
        if (payload?.data) {
          setAcademicPeriods((previous) => [
            ...previous.map((item) => ({ ...item, status: "Tidak aktif" })),
            payload.data!,
          ]);
        }
      }
      setNotice(payload?.message ?? "Periode akademik berhasil ditambahkan dan diaktifkan.");
    } catch {
      setNotice("Tidak dapat terhubung ke server backend. Periode tidak disimpan.");
    }
  }

  async function exportStudents() {
    let sourceStudents = periodRecords.students;

    const token = getStoredAccessToken();
    if (token) {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/siswa/export`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            data?: AdminRecord[];
          } | null;
          if (Array.isArray(payload?.data)) {
            sourceStudents = payload.data;
          }
        }
      } catch {
        // Fallback to current state when export endpoint is unreachable
      }
    }

    const dataRows = sourceStudents.map((student) => [
      student.nis,
      student.nisn,
      student.name,
      student.gender,
      student.className,
      student.status,
    ]);
    try {
      await downloadSpreadsheet(
        "data-siswa-sipena.xlsx",
        [studentSpreadsheetHeaders, ...dataRows],
        "Data Siswa",
      );
      setNotice("Data siswa berhasil diekspor.");
    } catch (error) {
      console.error("Failed to export students.", error);
      setNotice("Data siswa tidak dapat diekspor. Silakan coba lagi.");
    }
  }

  async function downloadStudentTemplate() {
    try {
      await downloadSpreadsheet(
        "template-data-siswa-sipena.xlsx",
        [studentSpreadsheetHeaders],
        "Data Siswa",
      );
      setNotice("Template data siswa berhasil diunduh.");
    } catch (error) {
      console.error("Failed to download student template.", error);
      setNotice("Template data siswa tidak dapat diunduh. Silakan coba lagi.");
    }
  }

  async function importStudents(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name)) {
      setNotice("Pilih file .xlsx atau .csv berukuran maksimal 5 MB.");
      return;
    }
    try {
      const rawRows = await readSpreadsheetFile(file);
      if (!rawRows) {
        setNotice("File tidak memiliki lembar kerja.");
        return;
      }
      const imported = rawRows
        .slice(1)
        .filter((row) => row.some((value) => String(value).trim()))
        .map((row) => ({
          id: createId(),
          nis: String(row[0] ?? "").trim(),
          nisn: String(row[1] ?? "").trim(),
          name: String(row[2] ?? "").trim(),
          gender: String(row[3] ?? "").trim().toUpperCase(),
          className: String(row[4] ?? "").trim(),
          status: String(row[5] ?? "Aktif").trim() || "Aktif",
          period: currentPeriod,
        }));
      if (
        imported.length === 0 ||
        imported.some(
          (student) =>
            !student.nis ||
            !student.name ||
            !periodRecords.classes.some((item) => item.code === student.className),
        )
      ) {
        setNotice(
          "Impor dibatalkan: setiap baris harus berisi NIS, nama, dan kode kelas yang terdaftar.",
        );
        return;
      }

      const token = getStoredAccessToken();
      if (!token) {
        setRecords((previous) => ({ ...previous, students: [...previous.students, ...imported] }));
        setNotice(`${imported.length} data siswa berhasil diimpor.`);
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
      const refreshed = await refreshOverview();
      if (!refreshed) {
        setRecords((previous) => ({ ...previous, students: [...previous.students, ...imported] }));
      }
      setNotice(payload?.message ?? `${imported.length} data siswa berhasil diimpor.`);
    } catch (error) {
      console.error("Failed to import students.", error);
      setNotice("File siswa tidak dapat dibaca. Periksa format dan coba lagi.");
    }
  }

  async function exportTeachers() {
    let sourceTeachers = periodRecords.teachers;

    const token = getStoredAccessToken();
    if (token) {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/guru/export`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            data?: AdminRecord[];
          } | null;
          if (Array.isArray(payload?.data)) {
            sourceTeachers = payload.data;
          }
        }
      } catch {
        // Fallback to current state when export endpoint is unreachable
      }
    }

    const dataRows = sourceTeachers.map((teacher) => [
      teacher.nip,
      teacher.name,
      teacher.gender ?? "L",
      teacher.email,
      teacher.status,
    ]);
    try {
      await downloadSpreadsheet(
        "data-guru-sipena.xlsx",
        [teacherSpreadsheetHeaders, ...dataRows],
        "Data Guru",
      );
      setNotice("Data guru berhasil diekspor.");
    } catch (error) {
      console.error("Failed to export teachers.", error);
      setNotice("Data guru tidak dapat diekspor. Silakan coba lagi.");
    }
  }

  async function downloadTeacherTemplate() {
    try {
      await downloadSpreadsheet(
        "template-data-guru-sipena.xlsx",
        [teacherSpreadsheetHeaders],
        "Data Guru",
      );
      setNotice("Template data guru berhasil diunduh.");
    } catch (error) {
      console.error("Failed to download teacher template.", error);
      setNotice("Template data guru tidak dapat diunduh. Silakan coba lagi.");
    }
  }

  async function importTeachers(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name)) {
      setNotice("Pilih file .xlsx atau .csv berukuran maksimal 5 MB.");
      return;
    }
    try {
      const rawRows = await readSpreadsheetFile(file);
      if (!rawRows) {
        setNotice("File tidak memiliki lembar kerja.");
        return;
      }
      const imported = rawRows
        .slice(1)
        .filter((row) => row.some((value) => String(value).trim()))
        .map((row) => {
          const thirdCell = String(row[2] ?? "").trim();
          const hasEmailInThirdCell = thirdCell.includes("@");
          const genderRaw = hasEmailInThirdCell ? "L" : thirdCell.toUpperCase() || "L";
          const emailRaw = hasEmailInThirdCell
            ? thirdCell.toLowerCase()
            : String(row[3] ?? "").trim().toLowerCase();
          const statusRaw = hasEmailInThirdCell
            ? String(row[3] ?? "Aktif").trim()
            : String(row[4] ?? "Aktif").trim();
          return {
            id: createId(),
            nip: String(row[0] ?? "").trim(),
            name: String(row[1] ?? "").trim(),
            gender: genderRaw,
            email: emailRaw,
            status: statusRaw || "Aktif",
            period: currentPeriod,
          };
        });
      if (
        imported.length === 0 ||
        imported.some(
          (teacher) =>
            !teacher.nip ||
            !teacher.name ||
            !teacher.email ||
            !teacher.email.includes("@") ||
            !["L", "P"].includes(teacher.gender),
        )
      ) {
        setNotice(
          "Impor dibatalkan: setiap baris harus berisi NIP, nama lengkap, jenis kelamin (L/P), dan email yang valid.",
        );
        return;
      }

      const token = getStoredAccessToken();
      if (!token) {
        setRecords((previous) => ({ ...previous, teachers: [...previous.teachers, ...imported] }));
        setNotice(`${imported.length} data guru berhasil diimpor.`);
        return;
      }

      const response = await fetch(`${apiBaseUrl}/v1/guru/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teachers: imported }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setNotice(payload?.message ?? "Impor guru ditolak oleh server.");
        return;
      }
      const refreshed = await refreshOverview();
      if (!refreshed) {
        setRecords((previous) => ({ ...previous, teachers: [...previous.teachers, ...imported] }));
      }
      setNotice(payload?.message ?? `${imported.length} data guru berhasil diimpor.`);
    } catch (error) {
      console.error("Failed to import teachers.", error);
      setNotice("File guru tidak dapat dibaca. Periksa format dan coba lagi.");
    }
  }

  const sortedPeriodOptions = useMemo(() => sortPeriodNames(periodOptions), [periodOptions]);

  if (route === "dashboard") {
    const classes = [...periodRecords.classes].sort((a, b) =>
      compareClassCodes(a.code ?? "", b.code ?? ""),
    );
    return (
      <DashboardPage
        classes={classes}
        currentPeriod={currentPeriod}
        notice={notice?.route === route ? notice.message : ""}
        onCreatePeriod={(year, semester) => {
          void addPeriod(year, semester);
        }}
        onPeriodChange={(nextPeriod) => {
          void selectPeriod(nextPeriod);
        }}
        onViewGrades={(classRecord) => {
          setSelectedGradeClass(classRecord);
          navigate("grades");
        }}
        periodOptions={sortedPeriodOptions}
        totalClasses={classes.length}
        totalStudents={periodRecords.students.length}
        totalSubjects={periodRecords.subjects.length}
        totalTeachers={periodRecords.teachers.length}
      />
    );
  }

  if (route === "grades" && selectedGradeClass) {
    const gradeClasses = [...periodRecords.classes].sort((a, b) =>
      compareClassCodes(a.code ?? "", b.code ?? ""),
    );
    return (
      <ClassGradesPage
        classRecord={selectedGradeClass}
        classes={gradeClasses}
        onClassChange={(classId) => {
          setSelectedGradeClass(
            gradeClasses.find((classRecord) => classRecord.id === classId) ?? null,
          );
        }}
        onNavigate={navigate}
        period={currentPeriod}
        students={periodRecords.students.filter(
          (student) => student.className === selectedGradeClass.code,
        )}
        subjects={periodRecords.subjects}
      />
    );
  }

  if (!currentRoute || !section) {
    return (
      <p className="admin-notice" role="status">
        Halaman admin tidak ditemukan.
      </p>
    );
  }

  const classOptions = [
    ...new Set(periodRecords.classes.map((classRecord) => classRecord.code)),
  ].sort(compareClassCodes);
  const commonProps = {
    currentPeriod,
    rows,
    visibleRows,
    search,
    onSearchChange: setSearch,
    onAdd: () => openForm("create"),
    onDetails: (record: AdminRecord) => openForm("details", record),
    onEdit: (record: AdminRecord) => openForm("edit", record),
    onDelete: (record: AdminRecord) => {
      void deleteRecord(record);
    },
    isLoading,
  };
  const fileActions =
    currentRoute === "students" ? (
      <div className="admin-file-actions">
        <button
          className="admin-secondary-button"
          onClick={() => void downloadStudentTemplate()}
          type="button"
        >
          Template XLSX
        </button>
        <label className="admin-secondary-button admin-file-button">
          Impor
          <input
            accept=".csv,.xlsx"
            aria-label="Impor data siswa"
            onChange={(event) => void importStudents(event)}
            type="file"
          />
        </label>
        <button
          className="admin-secondary-button"
          onClick={() => void exportStudents()}
          type="button"
        >
          Ekspor
        </button>
      </div>
    ) : currentRoute === "teachers" ? (
      <div className="admin-file-actions">
        <button
          className="admin-secondary-button"
          onClick={() => void downloadTeacherTemplate()}
          type="button"
        >
          Template XLSX
        </button>
        <label className="admin-secondary-button admin-file-button">
          Impor
          <input
            accept=".csv,.xlsx"
            aria-label="Impor data guru"
            onChange={(event) => void importTeachers(event)}
            type="file"
          />
        </label>
        <button
          className="admin-secondary-button"
          onClick={() => void exportTeachers()}
          type="button"
        >
          Ekspor
        </button>
      </div>
    ) : undefined;
  const page =
    currentRoute === "students" ? (
      <StudentDataPage
        {...commonProps}
        classOptions={classOptions}
        fileActions={fileActions}
        onClassChange={setSelectedClass}
        selectedClass={selectedClass}
      />
    ) : currentRoute === "teachers" ? (
      <TeacherDataPage {...commonProps} fileActions={fileActions} />
    ) : currentRoute === "classes" ? (
      <ClassDataPage {...commonProps} />
    ) : currentRoute === "subjects" ? (
      <SubjectDataPage {...commonProps} />
    ) : (
      <TeacherAssignmentsPage
        {...commonProps}
        classOptions={classOptions}
        classOrder={assignmentClassOrder}
        onClassChange={setSelectedClass}
        onClassOrderChange={setAssignmentClassOrder}
        selectedClass={selectedClass}
      />
    );

  return (
    <>
      {notice?.route === route && (
        <p className="admin-notice" role="status">
          {notice.message}
        </p>
      )}
      {page}
      {dialogMode && (
        <AdminFormDialog
          dialogMode={dialogMode}
          formError={formError}
          getOptions={(fieldKey) =>
            getFieldOptions(fieldKey, periodRecords, currentPeriod, sortedPeriodOptions)
          }
          onClose={closeForm}
          onSave={(event) => void saveRecord(event)}
          section={section}
          selectedRecord={selectedRecord}
        />
      )}
    </>
  );
}

export default AdminPanel;
