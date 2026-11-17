import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  downloadSpreadsheet as writeSpreadsheet,
  readSpreadsheetFile,
  type SpreadsheetCell,
} from "../../lib/spreadsheet";
import { getStoredAccessToken } from "../Login/auth";
import AssignmentsPage from "./AssignmentsPage";
import ClassDetailPage from "./ClassDetailPage";
import GradeEntryPage from "./GradeEntryPage";
import GradeSettingsPage from "./GradeSettingsPage";
import TeacherDashboardPage from "./TeacherDashboardPage";
import { AssignmentSelector, TeacherPageHeading } from "./TeacherHeader";
import type {
  GradeComponent,
  GradeRange,
  PeriodOption,
  ScoreEntriesMap,
  ScoreMap,
  TeacherPanelProps,
  TeacherRoute,
  TeachingAssignment,
} from "./types";
import {
  calculateFinal,
  createComponentId,
  defaultGrades,
  emptyAssignment,
  formatCompletionStatus,
  initialComponents,
  resolvePredicate,
  sortPeriodOptions,
  titleByRoute,
} from "./utils";
import "./TeacherPanel.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

function TeacherPanel({
  route,
  onNavigate,
  onUnsavedChange,
}: TeacherPanelProps) {
  const [assignmentList, setAssignmentList] = useState<TeachingAssignment[]>([]);
  const [gradeRanges, setGradeRanges] = useState<GradeRange[]>(defaultGrades);
  const [periodList, setPeriodList] = useState<PeriodOption[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedSettingsAssignmentId, setSelectedSettingsAssignmentId] = useState("");
  const [componentsByAssignment, setComponentsByAssignment] = useState<
    Record<string, GradeComponent[]>
  >({});
  const [scores, setScores] = useState<ScoreMap>({});
  const [scoreEntries, setScoreEntries] = useState<ScoreEntriesMap>({});
  const [kkmDrafts, setKkmDrafts] = useState<Record<string, string>>({});
  const [hasUnsavedScores, setHasUnsavedScores] = useState(false);
  const [hasUnsavedComponents, setHasUnsavedComponents] = useState(false);
  const [hasUnsavedKkm, setHasUnsavedKkm] = useState(false);
  const [search, setSearch] = useState("");
  const [gradeStatusFilter, setGradeStatusFilter] = useState("Semua status");
  const [notice, setNoticeState] = useState<{ message: string; route: string; id: number } | null>(
    null,
  );
  const noticeId = useRef(0);

  function setNotice(message: string, noticeRoute = route) {
    if (!message) {
      setNoticeState(null);
      return;
    }

    noticeId.current += 1;
    setNoticeState({ message, route: noticeRoute, id: noticeId.current });
  }

  useEffect(() => {
    onUnsavedChange?.(hasUnsavedScores || hasUnsavedComponents || hasUnsavedKkm);
  }, [hasUnsavedScores, hasUnsavedComponents, hasUnsavedKkm, onUnsavedChange]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => {
      setNoticeState((current) => (current?.id === notice.id ? null : current));
    }, 10_000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  function applyWorkspacePayload(data: {
    assignments?: TeachingAssignment[];
    componentsByAssignment?: Record<string, GradeComponent[]>;
    scores?: ScoreMap;
    scoreEntries?: ScoreEntriesMap;
    grades?: GradeRange[];
    periods?: PeriodOption[];
    selectedPeriod?: string | null;
  }) {
    if (Array.isArray(data.periods)) {
      setPeriodList(sortPeriodOptions(data.periods));
    }
    if (typeof data.selectedPeriod === "string" && data.selectedPeriod) {
      setSelectedPeriod(data.selectedPeriod);
    }
    if (Array.isArray(data.assignments)) {
      setAssignmentList(data.assignments);
      setKkmDrafts({
        all: String(data.assignments[0]?.kkm ?? 75),
        ...Object.fromEntries(
          data.assignments.map((assignment) => [assignment.id, String(assignment.kkm)]),
        ),
      });
      if (data.assignments.length > 0) {
        const firstId = data.assignments[0].id;
        setSelectedAssignmentId((prev) =>
          data.assignments?.some((item) => item.id === prev) ? prev : firstId,
        );
        setSelectedSettingsAssignmentId((prev) =>
          prev === "all" || data.assignments?.some((item) => item.id === prev) ? prev : firstId,
        );
      } else {
        setSelectedAssignmentId("");
        setSelectedSettingsAssignmentId("");
      }
    }
    if (data.componentsByAssignment) {
      setComponentsByAssignment(data.componentsByAssignment);
    }
    if (data.scores) {
      setScores(data.scores);
      setScoreEntries(
        data.scoreEntries ??
          Object.fromEntries(
            Object.entries(data.scores).map(([studentId, componentScores]) => [
              studentId,
              Object.fromEntries(
                Object.entries(componentScores).map(([componentId, score]) => [
                  componentId,
                  score === "" ? [] : [score],
                ]),
              ),
            ]),
          ),
      );
    } else if (data.scoreEntries) {
      setScoreEntries(data.scoreEntries);
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
    setHasUnsavedKkm(false);
  }

  useEffect(() => {
    if (!hasUnsavedScores && !hasUnsavedComponents && !hasUnsavedKkm) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedScores, hasUnsavedComponents, hasUnsavedKkm]);

  async function loadTeacherWorkspace(periodName?: string) {
    const token = getStoredAccessToken();
    if (!token) {
      setIsLoading(false);
      setNotice(
        "Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Silakan login kembali.",
      );
      return;
    }
    try {
      const query = periodName ? `?period=${encodeURIComponent(periodName)}` : "";
      const res = await fetch(`${apiBaseUrl}/v1/guru/dashboard${query}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        setNotice("Gagal memuat data pengajaran dari server backend.");
        return;
      }
      const payload = (await res.json()) as {
        data?: {
          assignments?: TeachingAssignment[];
          componentsByAssignment?: Record<string, GradeComponent[]>;
          scores?: ScoreMap;
          scoreEntries?: ScoreEntriesMap;
          grades?: GradeRange[];
          periods?: PeriodOption[];
          selectedPeriod?: string | null;
        };
      } | null;
      if (payload?.data) {
        applyWorkspacePayload(payload.data);
      }
    } catch {
      setNotice(
        "Tidak dapat terhubung ke server backend. Pastikan server backend (php artisan serve) sedang aktif.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTeacherWorkspace();
  }, []);

  useEffect(() => {
    if (
      !getStoredAccessToken() ||
      hasUnsavedScores ||
      hasUnsavedComponents ||
      hasUnsavedKkm
    ) {
      return;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadTeacherWorkspace(selectedPeriod || undefined);
      }
    };
    const interval = window.setInterval(refreshWhenVisible, 5_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [selectedPeriod, hasUnsavedScores, hasUnsavedComponents, hasUnsavedKkm]);

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
  const totalWeight = components.reduce(
    (total, component) => total + (Number(component.weight) || 0),
    0,
  );
  const hasValidWeights =
    components.length > 0 &&
    components.every(
      (component) => Number(component.weight) > 0 && Number(component.weight) <= 100,
    ) &&
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

  const completionCount = currentAssignment.students.filter(
    (student) => calculateFinal(student.id, components, scores) !== null,
  ).length;
  const finalScores = currentAssignment.students
    .map((student) => calculateFinal(student.id, components, scores))
    .filter((score): score is number => score !== null);
  const average = finalScores.length
    ? Math.round(
        (finalScores.reduce((total, score) => total + score, 0) / finalScores.length) * 100,
      ) / 100
    : null;
  const highest = finalScores.length ? Math.max(...finalScores) : null;
  const lowest = finalScores.length ? Math.min(...finalScores) : null;

  function confirmDiscardChanges(promptMessage: string): boolean {
    if (
      (hasUnsavedScores || hasUnsavedComponents || hasUnsavedKkm) &&
      !window.confirm(promptMessage)
    ) {
      return false;
    }
    setHasUnsavedScores(false);
    setHasUnsavedComponents(false);
    setHasUnsavedKkm(false);
    return true;
  }

  function navigate(nextRoute: string) {
    if (
      !confirmDiscardChanges(
        "Ada perubahan nilai, komponen, atau KKM yang belum disimpan ke database. Yakin ingin berpindah halaman tanpa menyimpan?",
      )
    ) {
      return;
    }
    setSearch("");
    setNotice("");
    onNavigate(nextRoute);
  }

  function openAssignment(assignmentId: string, nextRoute: string) {
    if (
      !confirmDiscardChanges(
        "Ada perubahan nilai, komponen, atau KKM yang belum disimpan ke database. Yakin ingin berpindah kelas tanpa menyimpan?",
      )
    ) {
      return;
    }
    setSelectedAssignmentId(assignmentId);
    setSearch("");
    setNotice("");
    onNavigate(nextRoute);
  }

  function updateScoreEntries(studentId: string, componentId: string, values: string[]) {
    if (currentAssignment.isLocked) {
      setNotice("Pengisian nilai pada kelas ini telah dikunci oleh Admin Sekolah.");
      return;
    }
    if (
      values.some(
        (value) =>
          value === "" ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0 ||
          Number(value) > 100,
      )
    ) {
      return;
    }
    const averageScore = values.length
      ? String(
          Math.round(
            (values.reduce((total, value) => total + Number(value), 0) / values.length +
              Number.EPSILON) *
              100,
          ) / 100,
        )
      : "";
    setHasUnsavedScores(true);
    setScoreEntries((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [componentId]: values },
    }));
    setScores((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [componentId]: averageScore },
    }));
  }

  function applySettingsComponents(nextComponents: GradeComponent[]) {
    if (selectedSettingsAssignmentId !== "all" && selectedSettingsAssignment.isLocked) {
      setNotice(
        "Komponen penilaian kelas ini tidak dapat diubah karena pengisian nilai sedang dikunci Admin.",
      );
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

  async function saveKkm() {
    const isAll = selectedSettingsAssignmentId === "all";
    const isLocked = isAll
      ? assignmentList.some((assignment) => Boolean(assignment.isLocked))
      : Boolean(selectedSettingsAssignment.isLocked);
    if (isLocked) {
      setNotice(
        "KKM tidak dapat diubah karena pengajaran ini sedang dikunci atau berada pada periode arsip.",
      );
      return;
    }
    const targetId = isAll ? "all" : selectedSettingsAssignment.id;
    const rawKkm =
      kkmDrafts[targetId] ??
      kkmDrafts[selectedSettingsAssignment.id] ??
      String(selectedSettingsAssignment.kkm);
    const kkm = Number(rawKkm);
    if (rawKkm.trim() === "" || !Number.isFinite(kkm) || kkm < 0 || kkm > 100) {
      setNotice("KKM harus berupa angka antara 0 dan 100.");
      return;
    }
    const token = getStoredAccessToken();
    if (!token) {
      setNotice(
        "Sesi autentikasi tidak ditemukan atau server backend tidak aktif. KKM tidak disimpan.",
      );
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/v1/pengajaran/${targetId}/kkm`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kkm }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        data?: {
          assignments?: TeachingAssignment[];
          componentsByAssignment?: Record<string, GradeComponent[]>;
          scores?: ScoreMap;
          scoreEntries?: ScoreEntriesMap;
          grades?: GradeRange[];
        };
      } | null;
      if (!response.ok) {
        setNotice(payload?.message ?? "Gagal menyimpan KKM ke server.");
        return;
      }
      if (payload?.data) {
        applyWorkspacePayload(payload.data);
      } else {
        setAssignmentList((current) =>
          current.map((assignment) =>
            isAll || assignment.id === selectedSettingsAssignment.id
              ? { ...assignment, kkm }
              : assignment,
          ),
        );
        setKkmDrafts((current) => {
          if (!isAll) {
            return { ...current, [selectedSettingsAssignment.id]: String(kkm) };
          }
          return {
            ...current,
            all: String(kkm),
            ...Object.fromEntries(assignmentList.map((item) => [item.id, String(kkm)])),
          };
        });
        setHasUnsavedKkm(false);
      }
      setNotice(payload?.message ?? "KKM berhasil disimpan.");
    } catch {
      setNotice("Tidak dapat terhubung ke server backend. KKM gagal disimpan.");
    }
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
    const token = getStoredAccessToken();
    if (!token) {
      setNotice(
        "Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Komponen tidak disimpan.",
      );
      return;
    }
    try {
      const targetId =
        selectedSettingsAssignmentId === "all" ? "all" : selectedSettingsAssignment.id;
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
          scoreEntries?: ScoreEntriesMap;
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

  async function saveScoresToBackend(
    scoresToSave: ScoreMap = scores,
    customMessage?: string,
    scoreEntriesToSave: ScoreEntriesMap = scoreEntries,
  ) {
    const token = getStoredAccessToken();
    if (!token) {
      setNotice(
        "Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Nilai tidak disimpan.",
      );
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
        body: JSON.stringify({ scores: scoresToSave, scoreEntries: scoreEntriesToSave }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        data?: {
          assignments?: TeachingAssignment[];
          componentsByAssignment?: Record<string, GradeComponent[]>;
          scores?: ScoreMap;
          scoreEntries?: ScoreEntriesMap;
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

  async function downloadSpreadsheet(filename: string, rows: SpreadsheetCell[][]) {
    await writeSpreadsheet(filename, rows, "Nilai");
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
    const headers = [
      "No",
      "NIS",
      "Nama Siswa",
      ...components.map((component) => component.name),
      "Nilai Akhir",
      "Predikat",
      "Status Kesesuaian",
    ];
    const rows = currentAssignment.students.map((student, index) => {
      const finalScore = calculateFinal(student.id, components, scores);
      return [
        index + 1,
        student.nis,
        student.name,
        ...components.map((component) => scores[student.id]?.[component.id] ?? ""),
        finalScore ?? "",
        resolvePredicate(finalScore, gradeRanges),
        formatCompletionStatus(finalScore, currentAssignment.kkm),
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
      const rows = await readSpreadsheetFile(file);
      if (!rows) {
        setNotice("File Excel tidak memiliki lembar kerja.");
        return;
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
          if (
            value !== "" &&
            (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)
          ) {
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
      const mergedEntries: ScoreEntriesMap = {
        ...scoreEntries,
        ...Object.fromEntries(
          Object.entries(nextScores).map(([studentId, studentScores]) => [
            studentId,
            Object.fromEntries(
              Object.entries(studentScores).map(([componentId, score]) => [
                componentId,
                score === "" ? [] : [score],
              ]),
            ),
          ]),
        ),
      };
      setScores(mergedScores);
      setScoreEntries(mergedEntries);
      await saveScoresToBackend(
        mergedScores,
        `${Object.keys(nextScores).length} baris nilai berhasil diimpor.`,
        mergedEntries,
      );
    } catch (error) {
      console.error("Failed to import grades spreadsheet.", error);
      setNotice("File tidak dapat dibaca. Periksa format Excel/CSV dan coba lagi.");
    }
  }

  const title = titleByRoute[currentRoute] ?? "Dashboard";

  function handlePeriodChange(nextPeriod: string) {
    if (
      !confirmDiscardChanges(
        "Ada perubahan nilai, komponen, atau KKM yang belum disimpan. Yakin ingin mengganti periode akademik?",
      )
    ) {
      return;
    }
    setSelectedPeriod(nextPeriod);
    void loadTeacherWorkspace(nextPeriod);
  }

  function renderHeading(description: string) {
    return (
      <TeacherPageHeading
        description={description}
        fallbackPeriod={currentAssignment.period}
        isDashboard={currentRoute === "dashboard"}
        onPeriodChange={handlePeriodChange}
        periodList={periodList}
        selectedPeriod={selectedPeriod}
        title={title}
      />
    );
  }

  function renderAssignmentSelector({
    selectedId = currentAssignment.id,
    onSelect = setSelectedAssignmentId,
    includeAll = false,
  }: {
    selectedId?: string;
    onSelect?: (assignmentId: string) => void;
    includeAll?: boolean;
  } = {}) {
    return (
      <AssignmentSelector
        assignmentList={assignmentList}
        includeAll={includeAll}
        onSelect={(assignmentId) => {
          if (
            !confirmDiscardChanges(
              "Ada perubahan nilai, komponen, atau KKM yang belum disimpan ke database. Yakin ingin berpindah pengajaran tanpa menyimpan?",
            )
          ) {
            return;
          }
          onSelect(assignmentId);
          setNotice("");
        }}
        selectedId={selectedId}
      />
    );
  }

  let content;
  if (isLoading) {
    content = (
      <>
        {renderHeading("")}
        <section className="teacher-card">
          <p className="teacher-empty">Memuat pengajaran...</p>
        </section>
      </>
    );
  } else if (assignmentList.length === 0) {
    content = (
      <>
        {renderHeading("")}
        <section className="teacher-card">
          <div className="teacher-card-heading">
            <div>
              <h2>Belum ada pengajaran</h2>
              <p>Hubungi Admin Sekolah untuk menambahkan kelas dan mata pelajaran.</p>
            </div>
          </div>
        </section>
      </>
    );
  } else {
    switch (currentRoute) {
      case "assignments":
        content = (
          <AssignmentsPage
            assignmentList={assignmentList}
            componentsByAssignment={componentsByAssignment}
            heading={renderHeading("")}
            onOpenAssignment={openAssignment}
            scores={scores}
          />
        );
        break;
      case "class-detail":
        content = (
          <ClassDetailPage
            assignmentSelector={renderAssignmentSelector()}
            average={average}
            completionCount={completionCount}
            components={components}
            currentAssignment={currentAssignment}
            gradeRanges={gradeRanges}
            heading={renderHeading("")}
            highest={highest}
            lowest={lowest}
            onExportGrades={() => void exportGrades()}
            onNavigate={navigate}
            scores={scores}
          />
        );
        break;
      case "grade-settings":
        content = (
          <GradeSettingsPage
            assignmentList={assignmentList}
            assignmentSelector={renderAssignmentSelector({
              selectedId: selectedSettingsAssignmentId,
              includeAll: true,
              onSelect: (assignmentId) => {
                setSelectedSettingsAssignmentId(assignmentId);
                setSelectedAssignmentId(
                  assignmentId === "all" ? (assignmentList[0]?.id ?? "") : assignmentId,
                );
              },
            })}
            hasUnsavedComponents={hasUnsavedComponents}
            hasUnsavedKkm={hasUnsavedKkm}
            heading={renderHeading("")}
            kkmValue={
              selectedSettingsAssignmentId === "all"
                ? (kkmDrafts.all ??
                  kkmDrafts[selectedSettingsAssignment.id] ??
                  selectedSettingsAssignment.kkm)
                : (kkmDrafts[selectedSettingsAssignment.id] ?? selectedSettingsAssignment.kkm)
            }
            onAddComponent={addComponent}
            onKkmChange={(value) => {
              setKkmDrafts((current) => {
                if (selectedSettingsAssignmentId === "all") {
                  return {
                    ...current,
                    all: value,
                    ...Object.fromEntries(assignmentList.map((item) => [item.id, value])),
                  };
                }
                return {
                  ...current,
                  [selectedSettingsAssignment.id]: value,
                };
              });
              setHasUnsavedKkm(true);
            }}
            onRemoveComponent={removeComponent}
            onSaveComponents={(event) => void saveComponents(event)}
            onSaveKkm={() => void saveKkm()}
            onUpdateComponent={updateComponent}
            selectedSettingsAssignment={selectedSettingsAssignment}
            selectedSettingsAssignmentId={selectedSettingsAssignmentId}
            settingsComponents={settingsComponents}
            settingsHasValidWeights={settingsHasValidWeights}
            settingsTotalWeight={settingsTotalWeight}
          />
        );
        break;
      case "grade-entry":
        content = (
          <GradeEntryPage
            assignmentSelector={renderAssignmentSelector()}
            completionCount={completionCount}
            components={components}
            currentAssignment={currentAssignment}
            filteredStudents={filteredStudents}
            gradeStatusFilter={gradeStatusFilter}
            hasUnsavedScores={hasUnsavedScores}
            hasValidWeights={hasValidWeights}
            heading={renderHeading("Input nilai per komponen.")}
            onDownloadTemplate={() => void downloadGradeTemplate()}
            onExportGrades={() => void exportGrades()}
            onGradeStatusFilterChange={setGradeStatusFilter}
            onImportGrades={(event) => void importGrades(event)}
            onSaveScores={() => void saveScoresToBackend()}
            onSearchChange={setSearch}
            onUpdateScoreEntries={updateScoreEntries}
            scoreEntries={scoreEntries}
            scores={scores}
            search={search}
            totalWeight={totalWeight}
          />
        );
        break;
      default:
        content = (
          <TeacherDashboardPage
            assignmentList={assignmentList}
            completionCount={completionCount}
            componentsByAssignment={componentsByAssignment}
            currentAssignment={currentAssignment}
            heading={renderHeading("")}
            onNavigate={navigate}
            onOpenAssignment={openAssignment}
            scores={scores}
          />
        );
    }
  }

  return (
    <div className="teacher-panel">
      {notice?.route === route && (
        <p className="teacher-notice" role="status">
          {notice.message}
        </p>
      )}
      {content}
    </div>
  );
}

export default TeacherPanel;
