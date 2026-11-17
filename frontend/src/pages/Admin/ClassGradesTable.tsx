import type { ReportRow } from "./classGradesUtils";
import type { AdminRecord } from "./types";

interface ClassGradesTableProps {
  classNameLabel: string;
  effectiveSubjects: AdminRecord[];
  orderedRows: ReportRow[];
  rankByStudentId: Map<string, number>;
  isExporting: boolean;
  onExport: () => void;
}

function ClassGradesTable({
  classNameLabel,
  effectiveSubjects,
  orderedRows,
  rankByStudentId,
  isExporting,
  onExport,
}: ClassGradesTableProps) {
  return (
    <section className="admin-records-card" aria-label={`Rekap nilai rapor kelas ${classNameLabel}`}>
      <div className="admin-section-heading admin-card-heading admin-grade-heading">
        <div>
          <h2>Rekap Nilai Rapor Siswa</h2>
          <p>Nilai akhir setiap mata pelajaran, nilai akhir semester, dan peringkat kelas.</p>
        </div>
        <button
          className="admin-primary-button"
          disabled={isExporting}
          onClick={onExport}
          type="button"
        >
          {isExporting ? "Mengekspor..." : "Ekspor Excel"}
        </button>
      </div>
      <div className="admin-table-scroll admin-entity-scroll">
        <table className="admin-table admin-report-table admin-entity-table">
          <thead>
            <tr>
              <th scope="col">NISN</th>
              <th scope="col">Nama Siswa</th>
              {effectiveSubjects.map((subject) => (
                <th key={subject.id} scope="col">
                  {subject.name}
                </th>
              ))}
              <th scope="col">Nilai Akhir Semester</th>
              <th scope="col">Peringkat Kelas</th>
            </tr>
          </thead>
          <tbody>
            {orderedRows.map((row) => (
              <tr key={row.student.id}>
                <td data-label="NISN">{row.student.nisn}</td>
                <td data-label="Nama Siswa">{row.student.name}</td>
                {row.subjectScores.map((score, index) => (
                  <td
                    data-label={effectiveSubjects[index]?.name ?? "Mata Pelajaran"}
                    key={effectiveSubjects[index]?.id ?? index}
                  >
                    {score?.toFixed(2) ?? "—"}
                  </td>
                ))}
                <td data-label="Nilai Akhir Semester">{row.semesterScore?.toFixed(2) ?? "—"}</td>
                <td data-label="Peringkat Kelas">{rankByStudentId.get(row.student.id) ?? "—"}</td>
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
    </section>
  );
}

export default ClassGradesTable;
