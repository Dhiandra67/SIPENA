import type {
  GradeComponent,
  GradeRange,
  ScoreMap,
  TeacherRoute,
  TeachingAssignment,
} from "./types";

export const defaultPeriod = "2026/2027 · Ganjil";

export const emptyAssignment: TeachingAssignment = {
  id: "none",
  subject: "Belum Ada Pengajaran",
  className: "—",
  period: defaultPeriod,
  kkm: 75,
  isLocked: false,
  students: [],
};

export const initialComponents: GradeComponent[] = [
  { id: "daily", name: "Tugas Harian", weight: "20" },
  { id: "quiz", name: "Ulangan Harian", weight: "25" },
  { id: "midterm", name: "STS", weight: "25" },
  { id: "final", name: "UAS", weight: "30" },
];

export const defaultGrades: GradeRange[] = [
  { letter: "A", lower: 85, upper: 100 },
  { letter: "B", lower: 70, upper: 84.99 },
  { letter: "C", lower: 55, upper: 69.99 },
  { letter: "D", lower: 0, upper: 54.99 },
];

export const titleByRoute: Record<TeacherRoute, string> = {
  dashboard: "Dashboard",
  assignments: "Pengajaran Saya",
  "class-detail": "Detail Kelas",
  "grade-settings": "Pengaturan Komponen Nilai",
  "grade-entry": "Input dan Kelola Nilai",
};

export function createComponentId() {
  return `component-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function calculateFinal(
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
    components.some(
      (component) => Number(component.weight) <= 0 || Number(component.weight) > 100,
    ) ||
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

export function resolvePredicate(score: number | null, gradeRanges: GradeRange[]): string {
  if (score === null) return "—";
  const exactMatch = gradeRanges.find((grade) => score >= grade.lower && score <= grade.upper);
  if (exactMatch) return exactMatch.letter;
  const fallbackMatch = [...gradeRanges]
    .sort((a, b) => b.lower - a.lower)
    .find((grade) => score >= grade.lower);
  return fallbackMatch?.letter ?? "D";
}

export function formatCompletionStatus(score: number | null, kkm: number): string {
  if (score === null) return "Belum lengkap";
  return score >= kkm ? "Tuntas" : "Belum tuntas";
}
