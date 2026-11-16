import type { AdminRecord } from "./types";

export interface ReportRow {
  student: AdminRecord;
  subjectScores: (number | undefined)[];
  semesterScore: number | null;
}

export interface RecapStudentPayload {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  scores: Record<string, number | null>;
}

export interface RecapResponsePayload {
  data?: {
    class?: AdminRecord;
    subjects?: AdminRecord[];
    students?: RecapStudentPayload[];
  };
}

export const demoSubjectScores: Record<string, Record<string, number>> = {
  s1: { MAT: 88, BIN: 90, IPA: 86, IPS: 89, SBD: 87 },
  s2: { MAT: 78, BIN: 82, IPA: 80, IPS: 76, SBD: 80 },
  s3: { MAT: 86, BIN: 82, IPA: 84, IPS: 80, SBD: 78 },
  s4: { MAT: 82, BIN: 86, IPA: 84, IPS: 88, SBD: 84 },
  s5: { MAT: 72, BIN: 76, IPA: 74, IPS: 78, SBD: 76 },
  s6: { MAT: 94, BIN: 92, IPA: 96, IPS: 94, SBD: 90 },
  s7: { MAT: 92, BIN: 90, IPA: 88, IPS: 94, SBD: 90 },
  s8: { MAT: 76, BIN: 80, IPA: 78, IPS: 82, SBD: 80 },
};

export function buildClassReportData(
  effectiveSubjects: AdminRecord[],
  students: AdminRecord[],
  recapStudents: RecapStudentPayload[] | null,
) {
  const reportRows: ReportRow[] = recapStudents
    ? recapStudents.map((student) => {
        const subjectScores = effectiveSubjects.map((subject) => {
          const rawScore = student.scores?.[subject.id] ?? student.scores?.[subject.code];
          return typeof rawScore === "number" ? rawScore : undefined;
        });
        const hasCompleteScores =
          subjectScores.length > 0 && subjectScores.every((score) => score !== undefined);
        const semesterScore = hasCompleteScores
          ? Math.round(
              (subjectScores.reduce((total, score) => total + (score ?? 0), 0) /
                subjectScores.length) *
                100,
            ) / 100
          : null;

        return {
          student: {
            id: student.id,
            nis: student.nis,
            nisn: student.nisn,
            name: student.name,
          },
          subjectScores,
          semesterScore,
        };
      })
    : students.map((student) => {
        const subjectScores = effectiveSubjects.map(
          (subject) => demoSubjectScores[student.id]?.[subject.code],
        );
        const hasCompleteScores =
          subjectScores.length > 0 && subjectScores.every((score) => score !== undefined);
        const semesterScore = hasCompleteScores
          ? Math.round(
              (subjectScores.reduce((total, score) => total + (score ?? 0), 0) /
                subjectScores.length) *
                100,
            ) / 100
          : null;

        return { student, subjectScores, semesterScore };
      });

  const orderedRows = [...reportRows].sort((first, second) => {
    if (first.semesterScore === null) return second.semesterScore === null ? 0 : 1;
    if (second.semesterScore === null) return -1;
    return second.semesterScore - first.semesterScore;
  });

  const rankByStudentId = new Map<string, number>();
  let previousScore: number | null = null;
  let currentRank = 0;
  orderedRows.forEach((row, index) => {
    if (row.semesterScore === null) return;
    if (row.semesterScore !== previousScore) currentRank = index + 1;
    rankByStudentId.set(row.student.id, currentRank);
    previousScore = row.semesterScore;
  });

  const rankedStudents = orderedRows.filter((row) => row.semesterScore !== null);

  return {
    orderedRows,
    rankByStudentId,
    rankedStudents,
  };
}
