import { useEffect, useState } from "react";
import { downloadSpreadsheet } from "../../lib/spreadsheet";
import { getStoredAccessToken } from "../Login/auth";
import ClassGradesRankingCards from "./ClassGradesRankingCards";
import ClassGradesTable from "./ClassGradesTable";
import {
  buildClassReportData,
  type RecapResponsePayload,
  type RecapStudentPayload,
} from "./classGradesUtils";
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

  useEffect(() => {
    setRecapSubjects(null);
    setRecapStudents(null);

    const token = getStoredAccessToken();
    if (!token || !classRecord.id) return;

    let cancelled = false;
    let requestPending = false;
    const refreshRecap = async () => {
      if (cancelled || requestPending) return;
      requestPending = true;
      try {
        const response = await fetch(`${apiBaseUrl}/v1/kelas/${classRecord.id}/rekap`, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) return;
        const payload = (await response.json()) as RecapResponsePayload;
        if (cancelled || !payload.data) return;
        if (Array.isArray(payload.data.subjects) && Array.isArray(payload.data.students)) {
          setRecapSubjects(payload.data.subjects);
          setRecapStudents(payload.data.students);
        }
      } catch {
        // Fallback to local records if backend recap endpoint is unavailable
      } finally {
        requestPending = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshRecap();
    };

    void refreshRecap();
    const interval = window.setInterval(refreshWhenVisible, 5_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [classRecord.id]);

  useEffect(() => {
    if (!exportNotice) return;

    const timeout = window.setTimeout(() => setExportNotice(""), 10_000);
    return () => window.clearTimeout(timeout);
  }, [exportNotice]);

  const effectiveSubjects = recapSubjects ?? subjects;
  const { orderedRows, rankByStudentId, rankedStudents } = buildClassReportData(
    effectiveSubjects,
    students,
    recapStudents,
  );

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
              <option key={classOption.id} value={classOption.id}>
                {classOption.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            {classRecord.name} · {period}
          </span>
          <h1>Nilai Kelas</h1>
          <p>Rekap rapor per mata pelajaran, nilai akhir semester, dan peringkat kelas.</p>
        </div>
        <span className="admin-active-period">{period}</span>
      </section>

      <ClassGradesRankingCards rankedStudents={rankedStudents} />

      {exportNotice && (
        <p className="admin-notice" role="status">
          {exportNotice}
        </p>
      )}

      <ClassGradesTable
        classNameLabel={classRecord.name}
        effectiveSubjects={effectiveSubjects}
        isExporting={isExporting}
        onExport={() => void exportReport()}
        orderedRows={orderedRows}
        rankByStudentId={rankByStudentId}
      />
    </div>
  );
}

export default ClassGradesPage;
