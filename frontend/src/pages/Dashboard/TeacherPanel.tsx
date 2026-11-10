import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { getStoredAccessToken, login } from "../Login/auth";
import "./TeacherPanel.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

type TeacherRoute =
  | "dashboard"
  | "assignments"
  | "class-detail"
  | "grade-settings"
  | "grade-entry"
  | "students"
  | "grade-summary"
  | "statistics"
  | "reports"
  | "profile";

interface TeacherStudent {
  id: string;
  nis: string;
  name: string;
  gender: "L" | "P";
}

interface TeachingAssignment {
  id: string;
  subject: string;
  className: string;
  period: string;
  kkm: number;
  isLocked?: boolean;
  students: TeacherStudent[];
}

interface GradeComponent {
  id: string;
  name: string;
  weight: string;
}

interface GradeRange {
  letter: string;
  lower: number;
  upper: number;
  description?: string;
}

type ScoreMap = Record<string, Record<string, string>>;

interface TeacherPanelProps {
  route: string;
  displayName: string;
  email: string;
  onNavigate: (route: string) => void;
  onProfileChange: (name: string) => void;
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}

const period = "2026/2027 · Ganjil";

const emptyAssignment: TeachingAssignment = {
  id: "none",
  subject: "Belum Ada Pengajaran",
  className: "—",
  period,
  kkm: 75,
  isLocked: false,
  students: [],
};

const initialComponents: GradeComponent[] = [
  { id: "daily", name: "Tugas Harian", weight: "20" },
  { id: "quiz", name: "Ulangan Harian", weight: "25" },
  { id: "midterm", name: "STS", weight: "25" },
  { id: "final", name: "UAS", weight: "30" },
];

const defaultGrades = [
  { letter: "A", lower: 85, upper: 100 },
  { letter: "B", lower: 70, upper: 84.99 },
  { letter: "C", lower: 55, upper: 69.99 },
  { letter: "D", lower: 0, upper: 54.99 },
];

function createComponentId() {
  return `component-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

function calculateFinal(
  studentId: string,
  components: GradeComponent[],
  scores: ScoreMap,
): number | null {
  if (components.length === 0) return null;
  const totalWeight = components.reduce(
    (total, component) => total + (Number(component.weight) || 0),
    0,
  );
  if (
    components.some((component) => Number(component.weight) <= 0 || Number(component.weight) > 100) ||
    Math.abs(totalWeight - 100) >= 0.0001
  ) {
    return null;
  }
  const weightedScore = components.reduce((total, component) => {
    const score = scores[studentId]?.[component.id];
    if (score === undefined || score === "") return Number.NaN;
    return total + (Number(score) * Number(component.weight)) / 100;
  }, 0);

  if (!Number.isFinite(weightedScore)) return null;
  return Math.round((weightedScore + Number.EPSILON) * 100) / 100;
}

function TeacherPanel({
  route,
  displayName,
  email,
  onNavigate,
  onProfileChange,
  onUnsavedChange,
}: TeacherPanelProps) {
  const [assignmentList, setAssignmentList] = useState<TeachingAssignment[]>([]);
  const [gradeRanges, setGradeRanges] = useState<GradeRange[]>(defaultGrades);
  const [periodList, setPeriodList] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendSynced, setIsBackendSynced] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedSettingsAssignmentId, setSelectedSettingsAssignmentId] = useState("");
  const [selectedStudentsAssignmentId, setSelectedStudentsAssignmentId] = useState("");
  const [componentsByAssignment, setComponentsByAssignment] = useState<
    Record<string, GradeComponent[]>
  >({});
  const [scores, setScores] = useState<ScoreMap>({});
  const [hasUnsavedScores, setHasUnsavedScores] = useState(false);
  const [hasUnsavedComponents, setHasUnsavedComponents] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [profileName, setProfileName] = useState(displayName);
  const [profileEmail, setProfileEmail] = useState(email);

  useEffect(() => {
    setProfileName(displayName);
    setProfileEmail(email);
  }, [displayName, email]);

  useEffect(() => {
    onUnsavedChange?.(hasUnsavedScores || hasUnsavedComponents);
  }, [hasUnsavedScores, hasUnsavedComponents, onUnsavedChange]);

  function getPredicate(score: number | null): string {
    if (score === null) return "—";
    const exactMatch = gradeRanges.find((grade) => score >= grade.lower && score <= grade.upper);
    if (exactMatch) return exactMatch.letter;
    const fallbackMatch = [...gradeRanges]
      .sort((a, b) => b.lower - a.lower)
      .find((grade) => score >= grade.lower);
    return fallbackMatch?.letter ?? "D";
  }

  function applyWorkspacePayload(data: {
    assignments?: TeachingAssignment[];
    componentsByAssignment?: Record<string, GradeComponent[]>;
    scores?: ScoreMap;
    grades?: GradeRange[];
    periods?: { id: string; name: string; isActive: boolean }[];
    selectedPeriod?: string | null;
  }) {
    if (Array.isArray(data.periods)) {
      setPeriodList(data.periods);
    }
    if (typeof data.selectedPeriod === "string" && data.selectedPeriod) {
      setSelectedPeriod(data.selectedPeriod);
    }
    if (Array.isArray(data.assignments)) {
      setAssignmentList(data.assignments);
      if (data.assignments.length > 0) {
        const firstId = data.assignments[0].id;
        setSelectedAssignmentId((prev) =>
          data.assignments?.some((item) => item.id === prev) ? prev : firstId,
        );
        setSelectedSettingsAssignmentId((prev) =>
          prev === "all" || data.assignments?.some((item) => item.id === prev) ? prev : firstId,
        );
        setSelectedStudentsAssignmentId((prev) =>
          prev === "all" || data.assignments?.some((item) => item.id === prev) ? prev : firstId,
        );
      } else {
        setSelectedAssignmentId("");
        setSelectedSettingsAssignmentId("");
        setSelectedStudentsAssignmentId("");
      }
    }
    if (data.componentsByAssignment) {
      setComponentsByAssignment(data.componentsByAssignment);
    }
    if (data.scores) {
      setScores(data.scores);
    }
    if (data.grades && data.grades.length > 0) {
      setGradeRanges(
        data.grades.map((grade) => ({
          letter: grade.letter,
          lower: Number(grade.lower),
          upper: Number(grade.upper),
          description: grade.description,
        })),
      );
    }
    setHasUnsavedScores(false);
    setHasUnsavedComponents(false);
    setIsBackendSynced(true);
  }

  useEffect(() => {
    if (!hasUnsavedScores && !hasUnsavedComponents) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedScores, hasUnsavedComponents]);

  async function ensureTeacherAccessToken(forceRefresh = false): Promise<string | null> {
    const existing = getStoredAccessToken();
    if (existing && !forceRefresh) {
      return existing;
    }
    if (import.meta.env.DEV) {
      try {
        const result = await login(
          { email: (email || "guru@example.com").trim().toLowerCase(), password: "guru12345" },
          true,
        );
        return result.accessToken;
      } catch {
        return null;
      }
    }
    return null;
  }

  async function loadTeacherWorkspace(periodName?: string) {
    let token = await ensureTeacherAccessToken();
    if (!token) {
      setIsBackendSynced(false);
      setIsLoading(false);
      setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Silakan login kembali.");
      return;
    }
    try {
      const query = periodName ? `?period=${encodeURIComponent(periodName)}` : "";
      let res = await fetch(`${apiBaseUrl}/v1/guru/dashboard${query}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401 && import.meta.env.DEV) {
        token = await ensureTeacherAccessToken(true);
        if (token) {
          res = await fetch(`${apiBaseUrl}/v1/guru/dashboard${query}`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }
      }
      if (!res.ok) {
        setIsBackendSynced(false);
        setNotice("Gagal memuat data pengajaran dari server backend.");
        return;
      }
      const payload = (await res.json()) as {
        data?: {
          assignments?: TeachingAssignment[];
          componentsByAssignment?: Record<string, GradeComponent[]>;
          scores?: ScoreMap;
          grades?: GradeRange[];
          periods?: { id: string; name: string; isActive: boolean }[];
          selectedPeriod?: string | null;
        };
      } | null;
      if (payload?.data) {
        applyWorkspacePayload(payload.data);
      }
    } catch {
      setIsBackendSynced(false);
      setNotice("Tidak dapat terhubung ke server backend. Pastikan server backend (php artisan serve) sedang aktif.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTeacherWorkspace();
  }, []);

  const currentAssignment =
    assignmentList.find((assignment) => assignment.id === selectedAssignmentId) ??
    assignmentList[0] ??
    emptyAssignment;
  const components = componentsByAssignment[currentAssignment.id] ?? initialComponents;
  const selectedSettingsAssignment =
    assignmentList.find((assignment) => assignment.id === selectedSettingsAssignmentId) ??
    assignmentList[0] ??
    emptyAssignment;
  const settingsComponents =
    componentsByAssignment[selectedSettingsAssignment.id] ?? initialComponents;
  const currentRoute = route as TeacherRoute;
  const totalWeight = components.reduce((total, component) => total + (Number(component.weight) || 0), 0);
  const hasValidWeights =
    components.length > 0 &&
    components.every((component) => Number(component.weight) > 0 && Number(component.weight) <= 100) &&
    Math.abs(totalWeight - 100) < 0.0001;
  const settingsTotalWeight = settingsComponents.reduce(
    (total, component) => total + (Number(component.weight) || 0),
    0,
  );
  const settingsHasValidWeights =
    settingsComponents.length > 0 &&
    settingsComponents.every(
      (component) => Number(component.weight) > 0 && Number(component.weight) <= 100,
    ) &&
    Math.abs(settingsTotalWeight - 100) < 0.0001;
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id");
    return currentAssignment.students.filter(
      (student) =>
        !query ||
        student.name.toLocaleLowerCase("id").includes(query) ||
        student.nis.includes(query),
    );
  }, [currentAssignment, search]);
  const allFilteredStudents = useMemo(
    () =>
      assignmentList.flatMap((assignment) =>
        assignment.students
          .filter((student) => {
            const query = search.trim().toLocaleLowerCase("id");
            return (
              !query ||
              student.name.toLocaleLowerCase("id").includes(query) ||
              student.nis.includes(query)
            );
          })
          .map((student) => ({ assignment, student })),
      ),
    [assignmentList, search],
  );

  const completionCount = currentAssignment.students.filter(
    (student) => calculateFinal(student.id, components, scores) !== null,
  ).length;
  const finalScores = currentAssignment.students
    .map((student) => calculateFinal(student.id, components, scores))
    .filter((score): score is number => score !== null);
  const average = finalScores.length
    ? Math.round((finalScores.reduce((total, score) => total + score, 0) / finalScores.length) * 100) / 100
    : null;
  const highest = finalScores.length ? Math.max(...finalScores) : null;
  const lowest = finalScores.length ? Math.min(...finalScores) : null;
  const passingCount = finalScores.filter((score) => score >= currentAssignment.kkm).length;

  function navigate(nextRoute: string) {
    if (
      (hasUnsavedScores || hasUnsavedComponents) &&
      !window.confirm(
        "Ada perubahan nilai atau komponen yang belum disimpan ke database. Yakin ingin berpindah halaman tanpa menyimpan?",
      )
    ) {
      return;
    }
    setHasUnsavedScores(false);
    setHasUnsavedComponents(false);
    setSearch("");
    setNotice("");
    onNavigate(nextRoute);
  }

  function openAssignment(assignmentId: string, nextRoute: string) {
    if (
      (hasUnsavedScores || hasUnsavedComponents) &&
      !window.confirm(
        "Ada perubahan nilai atau komponen yang belum disimpan ke database. Yakin ingin berpindah kelas tanpa menyimpan?",
      )
    ) {
      return;
    }
    setHasUnsavedScores(false);
    setHasUnsavedComponents(false);
    setSelectedAssignmentId(assignmentId);
    setSearch("");
    setNotice("");
    onNavigate(nextRoute);
  }

  function updateScore(studentId: string, componentId: string, value: string) {
    if (currentAssignment.isLocked) {
      setNotice("Pengisian nilai pada kelas ini telah dikunci oleh Admin Sekolah.");
      return;
    }
    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
      return;
    }
    setHasUnsavedScores(true);
    setScores((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [componentId]: value },
    }));
  }

  function applySettingsComponents(nextComponents: GradeComponent[]) {
    if (selectedSettingsAssignmentId !== "all" && selectedSettingsAssignment.isLocked) {
      setNotice("Komponen penilaian kelas ini tidak dapat diubah karena pengisian nilai sedang dikunci Admin.");
      return;
    }
    const targetIds =
      selectedSettingsAssignmentId === "all"
        ? assignmentList.map((assignment) => assignment.id)
        : [selectedSettingsAssignment.id];
    setHasUnsavedComponents(true);
    setComponentsByAssignment((current) =>
      targetIds.reduce(
        (updated, assignmentId) => ({
          ...updated,
          [assignmentId]: nextComponents.map((component) => ({ ...component })),
        }),
        current,
      ),
    );
  }

  function updateComponent(componentId: string, key: "name" | "weight", value: string) {
    applySettingsComponents(
      settingsComponents.map((component) =>
        component.id === componentId ? { ...component, [key]: value } : component,
      ),
    );
  }

  function addComponent() {
    applySettingsComponents([
      ...settingsComponents,
      { id: createComponentId(), name: "", weight: "0" },
    ]);
  }

  function removeComponent(componentId: string) {
    if (settingsComponents.length === 1) {
      setNotice("Pengajaran harus memiliki minimal satu komponen penilaian.");
      return;
    }
    applySettingsComponents(
      settingsComponents.filter((component) => component.id !== componentId),
    );
  }

  async function saveComponents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (settingsComponents.some((component) => !component.name.trim())) {
      setNotice("Nama setiap komponen harus diisi.");
      return;
    }
    const settingsWeight = settingsComponents.reduce(
      (total, component) => total + (Number(component.weight) || 0),
      0,
    );
    const validSettingsWeights =
      settingsComponents.length > 0 &&
      settingsComponents.every(
        (component) => Number(component.weight) > 0 && Number(component.weight) <= 100,
      ) &&
      Math.abs(settingsWeight - 100) < 0.0001;
    if (!validSettingsWeights) {
      setNotice("Total bobot harus tepat 100% dan setiap bobot lebih dari 0%.");
      return;
    }
    const token = await ensureTeacherAccessToken();
    if (!token) {
      setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Komponen tidak disimpan.");
      return;
    }
    try {
      const targetId = selectedSettingsAssignmentId === "all" ? "all" : selectedSettingsAssignment.id;
      const response = await fetch(`${apiBaseUrl}/v1/pengajaran/${targetId}/komponen`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ components: settingsComponents }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        data?: {
          assignments?: TeachingAssignment[];
          componentsByAssignment?: Record<string, GradeComponent[]>;
          scores?: ScoreMap;
          grades?: GradeRange[];
        };
      } | null;
      if (!response.ok) {
        setNotice(payload?.message ?? "Gagal menyimpan komponen penilaian ke server.");
        return;
      }
      if (payload?.data) {
        applyWorkspacePayload(payload.data);
      }
      setNotice(payload?.message ?? "Komponen penilaian berhasil disimpan.");
    } catch {
      setNotice("Tidak dapat terhubung ke server backend. Komponen penilaian gagal disimpan.");
    }
  }

  async function saveScoresToBackend(scoresToSave: ScoreMap = scores, customMessage?: string) {
    const token = await ensureTeacherAccessToken();
    if (!token) {
      setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Nilai tidak disimpan.");
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/v1/pengajaran/${currentAssignment.id}/nilai`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scores: scoresToSave }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        data?: {
          assignments?: TeachingAssignment[];
          componentsByAssignment?: Record<string, GradeComponent[]>;
          scores?: ScoreMap;
          grades?: GradeRange[];
        };
      } | null;
      if (!response.ok) {
        setNotice(payload?.message ?? "Gagal menyimpan nilai siswa ke server.");
        return;
      }
      if (payload?.data) {
        applyWorkspacePayload(payload.data);
      }
      setNotice(customMessage ?? payload?.message ?? "Nilai berhasil disimpan ke database.");
    } catch {
      setNotice("Tidak dapat terhubung ke server backend. Nilai siswa gagal disimpan.");
    }
  }

  async function downloadSpreadsheet(filename: string, rows: (string | number)[][]) {
    const XLSX = (await import("@e965/xlsx/dist/xlsx.mini.min.js")).default;
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai");
    XLSX.writeFile(workbook, filename);
  }

  async function downloadGradeTemplate() {
    const headers = ["NIS", "Nama Siswa", ...components.map((component) => component.name)];
    const rows = currentAssignment.students.map((student) => [student.nis, student.name]);
    try {
      await downloadSpreadsheet(
        `Template_Nilai_${currentAssignment.className}.xlsx`,
        [headers, ...rows],
      );
      setNotice("Template nilai berhasil diunduh.");
    } catch (error) {
      console.error("Failed to export grade template.", error);
      setNotice("Template tidak dapat diunduh. Silakan coba lagi.");
    }
  }

  async function exportGrades() {
    const headers = ["NIS", "Nama Siswa", ...components.map((component) => component.name), "Nilai Akhir", "Predikat"];
    const rows = currentAssignment.students.map((student) => {
      const finalScore = calculateFinal(student.id, components, scores);
      return [
        student.nis,
        student.name,
        ...components.map((component) => scores[student.id]?.[component.id] ?? ""),
        finalScore ?? "",
        getPredicate(finalScore),
      ];
    });
    try {
      await downloadSpreadsheet(
        `Laporan_Nilai_${currentAssignment.subject.replace(/\s+/g, "_")}_${currentAssignment.className}.xlsx`,
        [headers, ...rows],
      );
      setNotice("Laporan nilai berhasil diunduh.");
    } catch (error) {
      console.error("Failed to export grade report.", error);
      setNotice("Laporan tidak dapat diunduh. Silakan coba lagi.");
    }
  }

  async function exportAllGrades() {
    const componentNames = Array.from(
      new Set(
        assignmentList.flatMap((assignment) =>
          (componentsByAssignment[assignment.id] ?? initialComponents).map(
            (component) => component.name,
          ),
        ),
      ),
    );
    const headers = [
      "Pengajaran",
      "Periode",
      "NIS",
      "Nama Siswa",
      ...componentNames,
      "Nilai Akhir",
      "Predikat",
      "KKM",
      "Ketuntasan",
    ];
    const rows = assignmentList.flatMap((assignment) => {
      const assignmentComponents = componentsByAssignment[assignment.id] ?? initialComponents;
      return assignment.students.map((student) => {
        const finalScore = calculateFinal(student.id, assignmentComponents, scores);
        return [
          `${assignment.subject} · ${assignment.className}`,
          assignment.period,
          student.nis,
          student.name,
          ...componentNames.map((name) => {
            const component = assignmentComponents.find((item) => item.name === name);
            return component ? scores[student.id]?.[component.id] ?? "" : "";
          }),
          finalScore ?? "",
          getPredicate(finalScore),
          assignment.kkm,
          finalScore === null
            ? "Belum lengkap"
            : finalScore >= assignment.kkm
              ? "Tuntas"
              : "Belum tuntas",
        ];
      });
    });

    try {
      await downloadSpreadsheet("Laporan_Semua_Pengajaran.xlsx", [headers, ...rows]);
      setNotice("Laporan seluruh pengajaran berhasil diunduh.");
    } catch (error) {
      console.error("Failed to export all teaching reports.", error);
      setNotice("Laporan seluruh pengajaran tidak dapat diunduh. Silakan coba lagi.");
    }
  }

  async function importGrades(event: ChangeEvent<HTMLInputElement>) {
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
      let rows: string[][];
      if (file.name.toLocaleLowerCase("id").endsWith(".csv")) {
        rows = parseCsv(await file.text());
      } else {
        const XLSX = (await import("@e965/xlsx/dist/xlsx.mini.min.js")).default;
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
          setNotice("File Excel tidak memiliki lembar kerja.");
          return;
        }
        rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
          header: 1,
          defval: "",
          raw: false,
        });
      }

      if (rows.length < 2) {
        setNotice("File tidak berisi nilai siswa.");
        return;
      }
      const headers = rows[0].map((header) =>
        header.replace(/^\uFEFF/, "").trim().toLocaleLowerCase("id"),
      );
      const nisColumn = headers.findIndex((header) => header === "nis");
      const componentColumns = components.map((component) =>
        headers.findIndex((header) => header === component.name.toLocaleLowerCase("id")),
      );
      if (nisColumn < 0 || componentColumns.some((column) => column < 0)) {
        setNotice("Header file harus berisi NIS dan semua nama komponen nilai.");
        return;
      }

      const nextScores: ScoreMap = {};
      const seenNis = new Set<string>();
      const errors: string[] = [];
      for (const [index, row] of rows.slice(1).entries()) {
        const nis = (row[nisColumn] ?? "").trim();
        if (!nis) {
          errors.push(`Baris ${index + 2}: NIS wajib diisi.`);
          continue;
        }
        if (seenNis.has(nis)) {
          errors.push(`Baris ${index + 2}: NIS duplikat.`);
          continue;
        }
        const student = currentAssignment.students.find((item) => item.nis === nis);
        if (!student) {
          errors.push(`Baris ${index + 2}: NIS ${nis} bukan siswa di kelas ini.`);
          continue;
        }

        const studentScores: Record<string, string> = {};
        for (const [componentIndex, component] of components.entries()) {
          const value = (row[componentColumns[componentIndex]] ?? "").trim();
          if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
            errors.push(`Baris ${index + 2}: nilai ${component.name} harus berada pada 0-100.`);
            break;
          }
          studentScores[component.id] = value;
        }
        seenNis.add(nis);
        nextScores[student.id] = studentScores;
      }

      if (errors.length) {
        setNotice(`Impor dibatalkan; nilai tidak disimpan. ${errors.slice(0, 3).join(" ")}`);
        return;
      }
      const mergedScores = { ...scores, ...nextScores };
      setScores(mergedScores);
      await saveScoresToBackend(mergedScores, `${Object.keys(nextScores).length} baris nilai berhasil diimpor.`);
    } catch (error) {
      console.error("Failed to import grades spreadsheet.", error);
      setNotice("File tidak dapat dibaca. Periksa format Excel/CSV dan coba lagi.");
    }
  }

  const titleByRoute: Record<TeacherRoute, string> = {
    dashboard: "Dashboard",
    assignments: "Pengajaran Saya",
    "class-detail": "Detail Kelas",
    "grade-settings": "Pengaturan Komponen Nilai",
    "grade-entry": "Input dan Kelola Nilai",
    students: "Data Siswa",
    "grade-summary": "Rekap Nilai Kelas",
    statistics: "Statistik",
    reports: "Laporan Nilai Mapel",
    profile: "Profil Saya",
  };
  const title = titleByRoute[currentRoute] ?? "Dashboard";

  function pageHeading(description: string) {
    return (
      <header className="teacher-page-heading">
        <div>
          <span className="teacher-eyebrow">RAPORKU · GURU</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {periodList.length > 0 ? (
          <label className="teacher-select-label" style={{ minWidth: "210px" }}>
            <span>Periode Akademik</span>
            <select
              value={selectedPeriod || currentAssignment.period}
              onChange={(event) => {
                if (
                  (hasUnsavedScores || hasUnsavedComponents) &&
                  !window.confirm(
                    "Ada perubahan nilai atau komponen yang belum disimpan. Yakin ingin mengganti periode akademik?",
                  )
                ) {
                  return;
                }
                const nextPeriod = event.target.value;
                setSelectedPeriod(nextPeriod);
                void loadTeacherWorkspace(nextPeriod);
              }}
            >
              {periodList.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}{item.isActive ? " (Aktif)" : " (Arsip)"}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="teacher-period-chip">{currentAssignment.period}</span>
        )}
      </header>
    );
  }

  function assignmentSelector({
    selectedId = currentAssignment.id,
    onSelect = setSelectedAssignmentId,
    includeAll = false,
  }: {
    selectedId?: string;
    onSelect?: (assignmentId: string) => void;
    includeAll?: boolean;
  } = {}) {
    return (
      <label className="teacher-select-label">
        <span>Pilih pengajaran</span>
        <select
          onChange={(event) => {
            if (
              (hasUnsavedScores || hasUnsavedComponents) &&
              !window.confirm(
                "Ada perubahan nilai atau komponen yang belum disimpan ke database. Yakin ingin berpindah pengajaran tanpa menyimpan?",
              )
            ) {
              return;
            }
            setHasUnsavedScores(false);
            setHasUnsavedComponents(false);
            onSelect(event.target.value);
            setNotice("");
          }}
          value={selectedId}
        >
          {includeAll && <option value="all">Semua Pengajaran</option>}
          {assignmentList.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.subject} · {assignment.className}{assignment.isLocked ? " (Terkunci)" : ""}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function studentTable(readOnly = false) {
    const showAllStudents =
      readOnly &&
      currentRoute === "students" &&
      selectedStudentsAssignmentId === "all";
    const tableRows = showAllStudents
      ? allFilteredStudents
      : filteredStudents.map((student) => ({ assignment: currentAssignment, student }));
    return (
      <div className="teacher-table-scroll">
        <table className="teacher-table">
          <thead>
            <tr>
              <th scope="col">No</th>
              <th scope="col">NIS</th>
              <th scope="col">Nama Siswa</th>
              <th scope="col">L/P</th>
              {showAllStudents && <th scope="col">Pengajaran</th>}
              {readOnly ? (
                <th scope="col">Status Nilai</th>
              ) : (
                components.map((component) => (
                  <th key={component.id} scope="col">
                    {component.name}
                    <small>{component.weight}%</small>
                  </th>
                ))
              )}
              {!readOnly && <th scope="col">Nilai Akhir</th>}
              {!readOnly && <th scope="col">Predikat</th>}
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ assignment, student }, index) => {
              const rowComponents = componentsByAssignment[assignment.id] ?? initialComponents;
              const finalScore = calculateFinal(student.id, rowComponents, scores);
              const completeScores = rowComponents.filter((component) => {
                const score = scores[student.id]?.[component.id];
                return score !== undefined && score !== "";
              }).length;
              return (
                <tr key={`${assignment.id}-${student.id}`}>
                  <td>{index + 1}</td>
                  <td>{student.nis}</td>
                  <td className="teacher-student-name">{student.name}</td>
                  <td>{student.gender}</td>
                  {showAllStudents && <td>{assignment.subject} · {assignment.className}</td>}
                  {readOnly ? (
                    <td>{completeScores}/{rowComponents.length} komponen</td>
                  ) : (
                    rowComponents.map((component) => (
                      <td key={component.id}>
                        <input
                          aria-label={`${component.name} ${student.name}`}
                          className="teacher-score-input"
                          disabled={Boolean(assignment.isLocked)}
                          max={100}
                          min={0}
                          onChange={(event) =>
                            updateScore(student.id, component.id, event.target.value)
                          }
                          step="0.01"
                          type="number"
                          value={scores[student.id]?.[component.id] ?? ""}
                        />
                      </td>
                    ))
                  )}
                  {!readOnly && (
                    <>
                      <td className="teacher-final-score">{finalScore?.toFixed(2) ?? "—"}</td>
                      <td>{getPredicate(finalScore)}</td>
                    </>
                  )}
                </tr>
              );
            })}
            {tableRows.length === 0 && (
              <tr>
                <td className="teacher-empty" colSpan={readOnly ? (showAllStudents ? 6 : 5) : components.length + 6}>
                  Siswa tidak ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function dashboardPage() {
    const studentTotal = assignmentList.reduce((total, assignment) => total + assignment.students.length, 0);
    return (
      <>
        {pageHeading(`Ringkasan pengajaran ${currentAssignment.subject}`)}
        <section className="teacher-stat-grid" aria-label="Ringkasan pengajaran">
          <article><span>Kelas Diampu</span><strong>{assignmentList.length}</strong><small>Periode aktif</small></article>
          <article><span>Mata Pelajaran</span><strong>{new Set(assignmentList.map((item) => item.subject)).size}</strong><small>Pengajaran aktif</small></article>
          <article><span>Jumlah Siswa</span><strong>{studentTotal}</strong><small>Di seluruh kelas</small></article>
          <article><span>Progres Input</span><strong>{completionCount}/{currentAssignment.students.length}</strong><small>{currentAssignment.className} · nilai lengkap</small></article>
        </section>

        <section className="teacher-academic-banner">
          <div><span>Periode akademik aktif</span><strong>{currentAssignment.period}</strong></div>
          <span className="teacher-status-chip">Aktif</span>
        </section>

        <section className="teacher-card">
          <div className="teacher-card-heading">
            <div><h2>Pengajaran Saya</h2><p>Pilih kelas untuk membuka detail, input nilai, atau statistik.</p></div>
            <button className="teacher-link-button" onClick={() => navigate("assignments")} type="button">Lihat semua</button>
          </div>
          <div className="teacher-assignment-grid">
            {assignmentList.map((assignment) => {
              const assignmentComponents = componentsByAssignment[assignment.id] ?? initialComponents;
              const completed = assignment.students.filter(
                (student) => calculateFinal(student.id, assignmentComponents, scores) !== null,
              ).length;
              return (
                <article className="teacher-assignment-card" key={assignment.id}>
                  <span className="teacher-assignment-icon" aria-hidden="true">M</span>
                  <div className="teacher-assignment-title">
                    <h3>{assignment.subject}</h3>
                    <span>{assignment.className} · {assignment.students.length} siswa</span>
                  </div>
                  <p>KKM {assignment.kkm} <span>·</span> {completed}/{assignment.students.length} nilai lengkap</p>
                  <div className="teacher-progress"><span style={{ width: `${assignment.students.length ? (completed / assignment.students.length) * 100 : 0}%` }} /></div>
                  <button onClick={() => openAssignment(assignment.id, "class-detail")} type="button">Buka kelas <span aria-hidden="true">→</span></button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="teacher-card teacher-dashboard-actions">
          <div className="teacher-card-heading"><div><h2>Akses cepat</h2><p>Lanjutkan pekerjaan penilaian Anda.</p></div></div>
          <div className="teacher-action-grid">
            <button onClick={() => navigate("grade-settings")} type="button"><strong>01</strong><span>Atur komponen &amp; bobot</span><small>Pastikan jumlah bobot 100%</small></button>
            <button onClick={() => navigate("grade-entry")} type="button"><strong>02</strong><span>Input dan kelola nilai</span><small>Nilai akhir dihitung otomatis</small></button>
            <button onClick={() => navigate("statistics")} type="button"><strong>03</strong><span>Lihat statistik kelas</span><small>Pantau capaian dan ketuntasan</small></button>
          </div>
        </section>
      </>
    );
  }

  function assignmentPage() {
    return (
      <>
        {pageHeading("Daftar kelas dan mata pelajaran yang Anda ampu.")}
        <section className="teacher-assignment-grid teacher-assignment-list">
          {assignmentList.map((assignment) => {
            const assignmentComponents = componentsByAssignment[assignment.id] ?? initialComponents;
            const completed = assignment.students.filter(
              (student) => calculateFinal(student.id, assignmentComponents, scores) !== null,
            ).length;
            return (
              <article className="teacher-assignment-card" key={assignment.id}>
                <div className="teacher-assignment-title">
                  <span className="teacher-assignment-icon" aria-hidden="true">M</span>
                  <div><h2>{assignment.subject}</h2><span>Kelas {assignment.className}</span></div>
                </div>
                <dl>
                  <div><dt>Periode</dt><dd>{assignment.period}</dd></div>
                  <div><dt>Jumlah siswa</dt><dd>{assignment.students.length} siswa</dd></div>
                  <div><dt>KKM</dt><dd>{assignment.kkm}</dd></div>
                </dl>
                <div className="teacher-progress-label"><span>Progres nilai</span><strong>{completed}/{assignment.students.length}</strong></div>
                <div className="teacher-progress"><span style={{ width: `${assignment.students.length ? (completed / assignment.students.length) * 100 : 0}%` }} /></div>
                <button onClick={() => openAssignment(assignment.id, "class-detail")} type="button">Detail kelas <span aria-hidden="true">→</span></button>
              </article>
            );
          })}
        </section>
      </>
    );
  }

  function classDetailPage() {
    return (
      <>
        {pageHeading("Ringkasan kelas, daftar siswa, dan akses penilaian.")}
        <section className="teacher-card teacher-class-summary">
          <div className="teacher-card-heading">
            <div><span className="teacher-eyebrow">DETAIL PENGAJARAN</span><h2>{currentAssignment.subject} · Kelas {currentAssignment.className}</h2><p>{currentAssignment.period}</p></div>
            {assignmentSelector()}
          </div>
          <div className="teacher-class-metrics">
            <div><span>Jumlah siswa</span><strong>{currentAssignment.students.length}</strong></div>
            <div><span>Nilai lengkap</span><strong>{completionCount}/{currentAssignment.students.length}</strong></div>
            <div><span>Rata-rata kelas</span><strong>{average?.toFixed(2) ?? "—"}</strong></div>
            <div><span>KKM</span><strong>{currentAssignment.kkm}</strong></div>
          </div>
          <div className="teacher-button-row">
            <button className="teacher-primary-button" onClick={() => navigate("grade-entry")} type="button">Input nilai</button>
            <button className="teacher-secondary-button" onClick={() => navigate("grade-settings")} type="button">Atur komponen</button>
            <button className="teacher-secondary-button" onClick={() => navigate("statistics")} type="button">Lihat statistik</button>
          </div>
        </section>
        <section className="teacher-card">
          <div className="teacher-card-heading"><div><h2>Daftar Siswa</h2><p>Data siswa pada kelas yang ditugaskan kepada Anda.</p></div><label className="teacher-search"><span className="visually-hidden">Cari siswa</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIS..." type="search" value={search} /></label></div>
          {studentTable(true)}
        </section>
      </>
    );
  }

  function gradeSettingsPage() {
    const showAll = selectedSettingsAssignmentId === "all";
    const isSettingsLocked = !showAll && Boolean(selectedSettingsAssignment.isLocked);
    return (
      <>
        {pageHeading("Atur komponen penilaian dan bobot untuk satu atau seluruh pengajaran.")}
        <section className="teacher-card">
          <div className="teacher-card-heading"><div><h2>Pengajaran</h2><p>Pilih satu pengajaran atau terapkan komponen yang sama ke seluruh kelas.</p></div>{assignmentSelector({
            selectedId: selectedSettingsAssignmentId,
            includeAll: true,
            onSelect: (assignmentId) => {
              setSelectedSettingsAssignmentId(assignmentId);
              setSelectedAssignmentId(assignmentId === "all" ? (assignmentList[0]?.id ?? "") : assignmentId);
            },
          })}</div>
          <div className="teacher-assignment-summary"><strong>{showAll ? `Semua pengajaran · ${assignmentList.length} kelas` : `${selectedSettingsAssignment.subject} · ${selectedSettingsAssignment.className}`}</strong><span>{selectedSettingsAssignment.period}</span>{!showAll && <span>KKM {selectedSettingsAssignment.kkm}</span>}</div>
        </section>
        {isSettingsLocked && (
          <p className="teacher-inline-warning" role="alert">
            Pengisian nilai dan pengaturan komponen untuk kelas ini sedang dikunci oleh Admin Sekolah.
          </p>
        )}
        {hasUnsavedComponents && (
          <p className="teacher-inline-warning" role="status">
            Ada perubahan komponen penilaian yang belum disimpan ke database. Klik tombol <strong>Simpan komponen</strong> sebelum berpindah halaman.
          </p>
        )}
        <form className="teacher-card teacher-components-form" onSubmit={saveComponents}>
          <div className="teacher-card-heading"><div><h2>Komponen Nilai</h2><p>{showAll ? "Perubahan komponen dan bobot akan diterapkan ke seluruh pengajaran." : "Total bobot seluruh komponen harus tepat 100%."}</p></div><button className="teacher-secondary-button" disabled={isSettingsLocked} onClick={addComponent} type="button">+ Tambah komponen</button></div>
          <div className="teacher-component-list">
            {settingsComponents.map((component, index) => (
              <div className="teacher-component-row" key={component.id}>
                <span className="teacher-component-index">{String(index + 1).padStart(2, "0")}</span>
                <label><span>Nama komponen</span><input disabled={isSettingsLocked} onChange={(event) => updateComponent(component.id, "name", event.target.value)} required value={component.name} /></label>
                <label className="teacher-weight-field"><span>Bobot (%)</span><input disabled={isSettingsLocked} max={100} min={0.01} onChange={(event) => updateComponent(component.id, "weight", event.target.value)} required step="0.01" type="number" value={component.weight} /></label>
                <button aria-label={`Hapus ${component.name || "komponen"}`} className="teacher-remove-button" disabled={isSettingsLocked} onClick={() => removeComponent(component.id)} type="button">Hapus</button>
              </div>
            ))}
          </div>
          <div className={`teacher-weight-summary${settingsHasValidWeights ? " valid" : " invalid"}`}>
            <div><span>Total bobot</span><strong>{settingsTotalWeight.toFixed(2)}%</strong></div>
            <div className="teacher-weight-track"><span style={{ width: `${Math.min(settingsTotalWeight, 100)}%` }} /></div>
            <small>{settingsHasValidWeights ? "Bobot sudah tepat 100%." : "Sesuaikan bobot hingga tepat 100% sebelum menyimpan."}</small>
          </div>
          <div className="teacher-form-actions"><button className="teacher-primary-button" disabled={!settingsHasValidWeights || isSettingsLocked} type="submit">Simpan komponen</button></div>
        </form>
      </>
    );
  }

  function gradeEntryPage() {
    const isGradeLocked = Boolean(currentAssignment.isLocked);
    return (
      <>
        {pageHeading("Masukkan nilai siswa. Nilai akhir dan predikat diperbarui otomatis.")}
        <section className="teacher-card teacher-grade-context">
          <div><span>Pengajaran aktif</span><strong>{currentAssignment.subject} · Kelas {currentAssignment.className}</strong><small>{currentAssignment.period} · KKM {currentAssignment.kkm}</small></div>
          {assignmentSelector()}
        </section>
        {isGradeLocked && (
          <p className="teacher-inline-warning" role="alert">
            Pengisian nilai untuk kelas ini sedang dikunci oleh Admin Sekolah. Hubungi Admin jika perlu melakukan revisi nilai.
          </p>
        )}
        {hasUnsavedScores && !isGradeLocked && (
          <p className="teacher-inline-warning" role="status">
            Ada perubahan nilai yang belum disimpan ke database. Klik tombol <strong>Simpan nilai</strong> sebelum berpindah halaman atau menutup tab.
          </p>
        )}
        {!hasValidWeights && <p className="teacher-inline-warning" role="alert">Total bobot komponen belum 100%. Perbaiki komponen sebelum menghitung nilai akhir.</p>}
        <section className="teacher-grade-toolbar">
          <label className="teacher-search"><span className="visually-hidden">Cari siswa</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIS..." type="search" value={search} /></label>
          <div className="teacher-file-actions">
            <button className="teacher-secondary-button" onClick={() => void downloadGradeTemplate()} type="button">Template XLSX</button>
            <label className="teacher-secondary-button teacher-upload-button">Impor XLSX/CSV<input accept=".csv,.xlsx" disabled={isGradeLocked} onChange={(event) => void importGrades(event)} type="file" /></label>
            <button className="teacher-secondary-button" onClick={() => void exportGrades()} type="button">Ekspor nilai</button>
          </div>
          <button className="teacher-primary-button" disabled={!hasValidWeights || isGradeLocked} onClick={() => void saveScoresToBackend()} type="button">Simpan nilai</button>
        </section>
        <section className="teacher-card teacher-grade-card">
          <div className="teacher-card-heading"><div><h2>Input Nilai Siswa</h2><p>{completionCount} dari {currentAssignment.students.length} siswa memiliki nilai lengkap.</p></div><span className="teacher-total-weight">Bobot {totalWeight}%</span></div>
          {studentTable()}
          <footer className="teacher-table-footer"><span>Nilai akhir dihitung jika semua komponen terisi.</span><span>Rentang nilai 0-100</span></footer>
        </section>
      </>
    );
  }

  function studentPage() {
    const showAll = selectedStudentsAssignmentId === "all";
    const selectedStudentAssignment =
      assignmentList.find((assignment) => assignment.id === selectedStudentsAssignmentId) ??
      assignmentList[0] ??
      emptyAssignment;
    return (
      <>
        {pageHeading(
          showAll
            ? "Data siswa dari seluruh pengajaran yang ditugaskan kepada Anda."
            : `Data siswa yang dapat Anda lihat dibatasi pada kelas ${selectedStudentAssignment.className}.`,
        )}
        <section className="teacher-card">
          <div className="teacher-card-heading"><div><h2>Data Siswa · {showAll ? "Semua Pengajaran" : selectedStudentAssignment.className}</h2><p>Akses baca saja sesuai penugasan Anda.</p></div><div className="teacher-card-controls">{assignmentSelector({
            selectedId: selectedStudentsAssignmentId,
            includeAll: true,
            onSelect: (assignmentId) => {
              setSelectedStudentsAssignmentId(assignmentId);
              setSelectedAssignmentId(assignmentId === "all" ? (assignmentList[0]?.id ?? "") : assignmentId);
            },
          })}<label className="teacher-search"><span className="visually-hidden">Cari siswa</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIS..." type="search" value={search} /></label></div></div>
          {studentTable(true)}
        </section>
      </>
    );
  }

  function statisticsPage() {
    const distribution = gradeRanges.map((grade) => ({
      ...grade,
      count: finalScores.filter((score) => getPredicate(score) === grade.letter).length,
    }));
    const passRate = finalScores.length ? Math.round((passingCount / finalScores.length) * 100) : 0;
    return (
      <>
        {pageHeading("Pantau capaian, distribusi predikat, dan ketuntasan kelas.")}
        <section className="teacher-card teacher-statistics-context"><div><span>Statistik pengajaran</span><strong>{currentAssignment.subject} · {currentAssignment.className}</strong></div>{assignmentSelector()}</section>
        <section className="teacher-stat-grid teacher-stat-grid-small" aria-label="Statistik kelas">
          <article><span>Rata-rata kelas</span><strong>{average?.toFixed(2) ?? "—"}</strong><small>Dari {finalScores.length} nilai lengkap</small></article>
          <article><span>Nilai tertinggi</span><strong>{highest?.toFixed(2) ?? "—"}</strong><small>Nilai akhir</small></article>
          <article><span>Nilai terendah</span><strong>{lowest?.toFixed(2) ?? "—"}</strong><small>Nilai akhir</small></article>
          <article><span>Ketuntasan</span><strong>{passRate}%</strong><small>{passingCount}/{finalScores.length} siswa · KKM {currentAssignment.kkm}</small></article>
        </section>
        <section className="teacher-stat-charts">
          <article className="teacher-card">
            <div className="teacher-card-heading"><div><h2>Distribusi Predikat</h2><p>Jumlah siswa berdasarkan nilai akhir.</p></div></div>
            <div className="teacher-grade-distribution">
              {distribution.map((grade) => (
                <div className="teacher-distribution-row" key={grade.letter}>
                  <strong>{grade.letter}</strong><div><span style={{ width: `${finalScores.length ? (grade.count / finalScores.length) * 100 : 0}%` }} /></div><small>{grade.count} siswa</small>
                </div>
              ))}
            </div>
          </article>
          <article className="teacher-card teacher-completion-card">
            <div className="teacher-card-heading"><div><h2>Progres Pengisian</h2><p>Kelengkapan semua komponen nilai.</p></div></div>
            <strong>{completionCount}<small>/{currentAssignment.students.length}</small></strong>
            <div className="teacher-progress"><span style={{ width: `${(completionCount / currentAssignment.students.length) * 100}%` }} /></div>
            <p>{currentAssignment.students.length - completionCount} siswa masih memiliki komponen kosong.</p>
          </article>
        </section>
        <div className="teacher-form-actions teacher-button-row"><button className="teacher-secondary-button" onClick={() => void exportGrades()} type="button">Unduh laporan pengajaran ini</button><button className="teacher-primary-button" onClick={() => void exportAllGrades()} type="button">Unduh semua laporan</button></div>
      </>
    );
  }

  function reportsPage() {
    return (
      <>
        {pageHeading("Lihat rekap nilai dan unduh laporan untuk kelas yang Anda ampu.")}
        <section className="teacher-card teacher-report-context"><div><span>Laporan nilai mata pelajaran</span><strong>{currentAssignment.subject} · {currentAssignment.className}</strong><small>{currentAssignment.period}</small></div>{assignmentSelector()}</section>
        <section className="teacher-stat-grid teacher-report-stats">
          <article><span>Jumlah siswa</span><strong>{currentAssignment.students.length}</strong></article>
          <article><span>Nilai lengkap</span><strong>{completionCount}</strong></article>
          <article><span>Rata-rata kelas</span><strong>{average?.toFixed(2) ?? "—"}</strong></article>
          <article><span>KKM</span><strong>{currentAssignment.kkm}</strong></article>
        </section>
        <section className="teacher-card teacher-report-card">
          <div className="teacher-card-heading"><div><h2>Rekapitulasi Nilai</h2><p>Nilai akhir menggunakan komponen dan bobot pengajaran.</p></div><div className="teacher-button-row"><button className="teacher-secondary-button" onClick={() => window.print()} type="button">Cetak</button><button className="teacher-primary-button" onClick={() => void exportGrades()} type="button">Unduh XLSX</button></div></div>
          <div className="teacher-table-scroll">
            <table className="teacher-table teacher-report-table">
              <thead><tr><th scope="col">No</th><th scope="col">NIS</th><th scope="col">Nama Siswa</th>{components.map((component) => <th key={component.id} scope="col">{component.name}</th>)}<th scope="col">Nilai Akhir</th><th scope="col">Predikat</th><th scope="col">Ketuntasan</th></tr></thead>
              <tbody>{currentAssignment.students.map((student, index) => {
                const score = calculateFinal(student.id, components, scores);
                return <tr key={student.id}><td>{index + 1}</td><td>{student.nis}</td><td className="teacher-student-name">{student.name}</td>{components.map((component) => <td key={component.id}>{scores[student.id]?.[component.id] || "—"}</td>)}<td className="teacher-final-score">{score?.toFixed(2) ?? "—"}</td><td>{getPredicate(score)}</td><td><span className={`teacher-pass-chip${score !== null && score >= currentAssignment.kkm ? " pass" : ""}`}>{score === null ? "Belum lengkap" : score >= currentAssignment.kkm ? "Tuntas" : "Belum tuntas"}</span></td></tr>;
              })}</tbody>
            </table>
          </div>
          <footer className="teacher-table-footer"><span>Rata-rata {average?.toFixed(2) ?? "—"}</span><span>Nilai tertinggi {highest?.toFixed(2) ?? "—"} · Terendah {lowest?.toFixed(2) ?? "—"}</span></footer>
        </section>
      </>
    );
  }

  function profilePage() {
    async function saveProfile(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const name = String(formData.get("name") ?? "").trim();
      const nextEmail = String(formData.get("email") ?? "").trim();
      const newPassword = String(formData.get("newPassword") ?? "");
      const confirmation = String(formData.get("confirmation") ?? "");
      if (newPassword && newPassword.length < 8) {
        setNotice("Kata sandi baru minimal 8 karakter.");
        return;
      }
      if (newPassword !== confirmation) {
        setNotice("Konfirmasi kata sandi tidak cocok.");
        return;
      }
      const token = await ensureTeacherAccessToken();
      if (!token) {
        setNotice("Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Profil tidak diperbarui.");
        return;
      }
      try {
        const response = await fetch(`${apiBaseUrl}/v1/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, email: nextEmail, newPassword, confirmation }),
        });
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        if (!response.ok) {
          setNotice(payload?.message ?? "Gagal memperbarui profil di server.");
          return;
        }
        setProfileName(name);
        setProfileEmail(nextEmail);
        onProfileChange(name);
        setNotice("Profil berhasil diperbarui.");
      } catch {
        setNotice("Tidak dapat terhubung ke server backend. Profil gagal diperbarui.");
      }
    }

    return (
      <>
        {pageHeading("Kelola informasi kontak dan kata sandi akun Anda.")}
        <section className="teacher-card teacher-profile-card">
          <div className="teacher-profile-avatar" aria-hidden="true">{profileName.trim().charAt(0).toUpperCase() || "G"}</div>
          <div><h2>{profileName}</h2><p>Guru Mata Pelajaran · {profileEmail}</p><span className="teacher-status-chip">Akun aktif</span></div>
        </section>
        <form className="teacher-card teacher-profile-form" onSubmit={saveProfile}>
          <div className="teacher-card-heading"><div><h2>Informasi Profil</h2><p>Perbarui informasi yang digunakan pada akun Anda.</p></div></div>
          <div className="teacher-profile-fields">
            <label>Nama lengkap<input defaultValue={profileName} name="name" required /></label>
            <label>Email<input defaultValue={profileEmail} name="email" required type="email" /></label>
            <label>Kata sandi baru <span>(opsional)</span><input autoComplete="new-password" name="newPassword" type="password" /></label>
            <label>Konfirmasi kata sandi<input autoComplete="new-password" name="confirmation" type="password" /></label>
          </div>
          <div className="teacher-form-actions"><button className="teacher-primary-button" type="submit">Simpan perubahan</button></div>
        </form>
      </>
    );
  }

  let content;
  if (isLoading) {
    content = (
      <>
        {pageHeading("Memuat data pengajaran dan nilai dari server...")}
        <section className="teacher-card">
          <p className="teacher-empty">Memuat data pengajaran dari database...</p>
        </section>
      </>
    );
  } else if (assignmentList.length === 0 && currentRoute !== "profile") {
    content = (
      <>
        {pageHeading("Daftar penugasan mengajar pada periode akademik terpilih.")}
        <section className="teacher-card">
          <div className="teacher-card-heading">
            <div>
              <h2>Belum Ada Penugasan Mengajar</h2>
              <p>
                Akun Anda belum memiliki penugasan kelas dan mata pelajaran pada periode akademik ini. Silakan hubungi Admin Sekolah untuk menambahkan penugasan pada menu <strong>Pembagian Tugas Guru</strong>.
              </p>
            </div>
          </div>
          <div className="teacher-button-row">
            <button className="teacher-secondary-button" onClick={() => navigate("profile")} type="button">
              Buka Profil Saya
            </button>
          </div>
        </section>
      </>
    );
  } else {
    switch (currentRoute) {
      case "assignments":
        content = assignmentPage();
        break;
      case "class-detail":
        content = classDetailPage();
        break;
      case "grade-settings":
        content = gradeSettingsPage();
        break;
      case "grade-entry":
        content = gradeEntryPage();
        break;
      case "students":
        content = studentPage();
        break;
      case "grade-summary":
      case "statistics":
        content = statisticsPage();
        break;
      case "reports":
        content = reportsPage();
        break;
      case "profile":
        content = profilePage();
        break;
      default:
        content = dashboardPage();
    }
  }

  return (
    <div className="teacher-panel">
      {notice && <p className="teacher-notice" role="status">{notice}</p>}
      {content}
      <p className="teacher-demo-note" role="note">
        {isLoading
          ? "Menghubungkan ke database PostgreSQL SIPENA..."
          : isBackendSynced
            ? "Terhubung ke database PostgreSQL SIPENA — komponen dan nilai langsung tersimpan ke server."
            : "Tidak terhubung ke server backend SIPENA. Pastikan server backend aktif agar data dapat dimuat dan disimpan."}
      </p>
    </div>
  );
}

export default TeacherPanel;
