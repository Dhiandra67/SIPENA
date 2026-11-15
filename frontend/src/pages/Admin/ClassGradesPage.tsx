import { useEffect, useState } from "react";
import { getStoredAccessToken } from "../Login/auth";
import { downloadSpreadsheet } from "./spreadsheet";
import type { AdminRecord } from "./types";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

interface ClassGradesPageProps {
  classRecord: AdminRecord;
  classes: AdminRecord[];
  students: AdminRecord[];
  subjects: AdminRecord[];
  period: string;
  onClassChange: (classId: string) => void;
  onNavigate: (route: string) => void;
}

interface ReportRow {
  student: AdminRecord;
  subjectScores: (number | undefined)[];
  semesterScore: number | null;
}

interface RecapStudentPayload {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  scores: Record<string, number | null>;
}

interface RecapResponsePayload {
  data?: {
    class?: AdminRecord;
    subjects?: AdminRecord[];
    students?: RecapStudentPayload[];
  };
}

const demoSubjectScores: Record<string, Record<string, number>> = {
  s1: { MAT: 88, BIN: 90, IPA: 86, IPS: 89, SBD: 87 },
  s2: { MAT: 78, BIN: 82, IPA: 80, IPS: 76, SBD: 80 },
  s3: { MAT: 86, BIN: 82, IPA: 84, IPS: 80, SBD: 78 },
  s4: { MAT: 82, BIN: 86, IPA: 84, IPS: 88, SBD: 84 },
  s5: { MAT: 72, BIN: 76, IPA: 74, IPS: 78, SBD: 76 },
  s6: { MAT: 94, BIN: 92, IPA: 96, IPS: 94, SBD: 90 },
  s7: { MAT: 92, BIN: 90, IPA: 88, IPS: 94, SBD: 90 },
  s8: { MAT: 76, BIN: 80, IPA: 78, IPS: 82, SBD: 80 },
};

function ClassGradesPage({
  classRecord,
  classes,
  students,
  subjects,
  period,
  onClassChange,
  onNavigate,
}: ClassGradesPageProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState("");
  const [recapSubjects, setRecapSubjects] = useState<AdminRecord[] | null>(null);
  const [recapStudents, setRecapStudents] = useState<RecapStudentPayload[] | null>(null);
  const [isBackendSynced, setIsBackendSynced] = useState(false);

  useEffect(() => {
    setRecapSubjects(null);
    setRecapStudents(null);
    setIsBackendSynced(false);

    const token = getStoredAccessToken();
    if (!token || !classRecord.id) return;

    let cancelled = false;
    void fetch(`${apiBaseUrl}/v1/kelas/${classRecord.id}/rekap`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? (res.json() as Promise<RecapResponsePayload>) : null))
      .then((payload) => {
        if (cancelled || !payload?.data) return;
        if (Array.isArray(payload.data.subjects) && Array.isArray(payload.data.students)) {
          setRecapSubjects(payload.data.subjects);
          setRecapStudents(payload.data.students);
          setIsBackendSynced(true);
        }
      })
      .catch(() => {
        // Fallback to local records if backend recap endpoint is unavailable
      });

    return () => {
      cancelled = true;
    };
  }, [classRecord.id]);

  const effectiveSubjects = recapSubjects ?? subjects;
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
              (subjectScores.reduce((total, score) => total + (score ?? 0), 0) / subjectScores.length) * 100,
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
              (subjectScores.reduce((total, score) => total + (score ?? 0), 0) / subjectScores.length) * 100,
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

  async function exportReport() {
    setIsExporting(true);
    setExportNotice("");
    const headers = [
      "NISN",
      "Nama Siswa",
      ...effectiveSubjects.map((subject) => subject.name),
      "Nilai Akhir Semester",
      "Peringkat Kelas",
    ];
    const rows = orderedRows.map((row) => [
      row.student.nisn,
      row.student.name,
      ...row.subjectScores.map((score) => score?.toFixed(2) ?? "—"),
      row.semesterScore?.toFixed(2) ?? "—",
      String(rankByStudentId.get(row.student.id) ?? "—"),
    ]);

    try {
      const safeClassName = (classRecord.code ?? "kelas").replace(/[^a-z0-9_-]/gi, "-");
      await downloadSpreadsheet(
        `rekap-rapor-${safeClassName}.xlsx`,
        [headers, ...rows],
        "Rekap Rapor",
      );
      setExportNotice("Rekap rapor berhasil diekspor ke Excel.");
    } catch (error) {
      console.error("Failed to export class report.", error);
      setExportNotice("Rekap rapor tidak dapat diekspor. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  }

  const rankedStudents = orderedRows.filter((row) => row.semesterScore !== null);

  return (
    <div className="admin-panel">
      <div className="admin-grade-navigation">
        <button
          className="admin-grade-dashboard-link"
          onClick={() => onNavigate("dashboard")}
          type="button"
        >
          Kembali ke Dashboard
        </button>
        <label className="admin-grade-class-picker">
          <span>Pindah ke kelas</span>
          <select
            aria-label="Pilih kelas lain"
            onChange={(event) => onClassChange(event.currentTarget.value)}
            value={classRecord.id}
          >
            {classes.map((classOption) => (
              <option key={classOption.id} value={classOption.id}>{classOption.name}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{classRecord.name} · {period}</span>
          <h1>Nilai Kelas</h1>
          <p>Rekap rapor per mata pelajaran, nilai akhir semester, dan peringkat kelas.</p>
        </div>
        <span className="admin-active-period">{period}</span>
      </section>

      {rankedStudents.length > 0 ? (
        <section className="admin-grade-ranking-grid" aria-label="Peringkat nilai siswa">
          {rankedStudents.slice(0, 3).map((row, index) => (
            <article className="admin-overview-card admin-grade-ranking-card" key={row.student.id}>
              <span className="admin-eyebrow">PERINGKAT {index + 1}</span>
              <strong>{row.student.name}</strong>
              <span>Nilai akhir semester {row.semesterScore?.toFixed(2)}</span>
            </article>
          ))}
        </section>
      ) : (
        <p className="admin-notice" role="status">Belum ada nilai rapor lengkap yang dapat direkap untuk kelas ini.</p>
      )}

      {exportNotice && <p className="admin-notice" role="status">{exportNotice}</p>}

      <section className="admin-records-card" aria-label={`Rekap nilai rapor kelas ${classRecord.name}`}>
        <div className="admin-section-heading admin-card-heading admin-grade-heading">
          <div>
            <h2>Rekap Nilai Rapor Siswa</h2>
            <p>Nilai akhir setiap mata pelajaran, nilai akhir semester, dan peringkat kelas.</p>
          </div>
          <button
            className="admin-primary-button"
            disabled={isExporting}
            onClick={() => void exportReport()}
            type="button"
          >
            {isExporting ? "Mengekspor..." : "Ekspor Excel"}
          </button>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table admin-report-table">
            <thead>
              <tr>
                <th scope="col">NISN</th>
                <th scope="col">Nama Siswa</th>
                {effectiveSubjects.map((subject) => <th key={subject.id} scope="col">{subject.name}</th>)}
                <th scope="col">Nilai Akhir Semester</th>
                <th scope="col">Peringkat Kelas</th>
              </tr>
            </thead>
            <tbody>
              {orderedRows.map((row) => (
                <tr key={row.student.id}>
                  <td>{row.student.nisn}</td>
                  <td>{row.student.name}</td>
                  {row.subjectScores.map((score, index) => (
                    <td key={effectiveSubjects[index]?.id ?? index}>{score?.toFixed(2) ?? "—"}</td>
                  ))}
                  <td>{row.semesterScore?.toFixed(2) ?? "—"}</td>
                  <td>{rankByStudentId.get(row.student.id) ?? "—"}</td>
                </tr>
              ))}
              {orderedRows.length === 0 && (
                <tr>
                  <td className="admin-empty" colSpan={effectiveSubjects.length + 4}>
                    Belum ada siswa pada kelas ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-demo-notice" role="note">
          {isBackendSynced
            ? "Nilai rapor dimuat langsung dari database SIPENA berdasarkan perhitungan nilai akhir guru."
            : "Nilai yang ditampilkan merupakan data pratinjau lokal."}
        </div>
      </section>
    </div>
  );
}

export default ClassGradesPage;
