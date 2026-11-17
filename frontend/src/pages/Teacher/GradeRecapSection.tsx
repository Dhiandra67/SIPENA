import type { GradeComponent, GradeRange, ScoreMap, TeachingAssignment } from "./types";
import { calculateFinal, formatCompletionStatus, resolvePredicate } from "./utils";

interface GradeRecapSectionProps {
  currentAssignment: TeachingAssignment;
  components: GradeComponent[];
  scores: ScoreMap;
  gradeRanges: GradeRange[];
  average: number | null;
  highest: number | null;
  lowest: number | null;
  onExportGrades: () => void;
}

function GradeRecapSection({
  currentAssignment,
  components,
  scores,
  gradeRanges,
  average,
  highest,
  lowest,
  onExportGrades,
}: GradeRecapSectionProps) {
  return (
    <section className="teacher-card teacher-report-card">
      <div className="teacher-card-heading">
        <div>
          <h2>Rekapitulasi Nilai</h2>
          <p>Nilai komponen, nilai akhir, dan kesesuaian dengan KKM.</p>
        </div>
        <div className="teacher-button-row">
          <button
            className="teacher-secondary-button"
            onClick={() => window.print()}
            type="button"
          >
            Cetak
          </button>
          <button className="teacher-primary-button" onClick={onExportGrades} type="button">
            Unduh XLSX
          </button>
        </div>
      </div>
      <div className="teacher-table-scroll">
        <table className="teacher-table teacher-report-table">
          <thead>
            <tr>
              <th scope="col">No</th>
              <th scope="col">NIS</th>
              <th scope="col">Nama Siswa</th>
              {components.map((component) => (
                <th key={component.id} scope="col">
                  {component.name}
                </th>
              ))}
              <th scope="col">Nilai Akhir</th>
              <th scope="col">Predikat</th>
              <th scope="col">Status Kesesuaian</th>
            </tr>
          </thead>
          <tbody>
            {currentAssignment.students.map((student, index) => {
              const score = calculateFinal(student.id, components, scores);
              return (
                <tr key={student.id}>
                  <td data-label="No">{index + 1}</td>
                  <td data-label="NIS">{student.nis}</td>
                  <td className="teacher-student-name" data-label="Nama Siswa">
                    {student.name}
                  </td>
                  {components.map((component) => (
                    <td data-label={component.name} key={component.id}>
                      {scores[student.id]?.[component.id] || "—"}
                    </td>
                  ))}
                  <td className="teacher-final-score" data-label="Nilai Akhir">
                    {score?.toFixed(2) ?? "—"}
                  </td>
                  <td data-label="Predikat">{resolvePredicate(score, gradeRanges)}</td>
                  <td data-label="Status Kesesuaian">
                    <span
                      className={`teacher-pass-chip${
                        score !== null && score >= currentAssignment.kkm ? " pass" : ""
                      }`}
                    >
                      {formatCompletionStatus(score, currentAssignment.kkm)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {currentAssignment.students.length === 0 && (
              <tr>
                <td className="teacher-empty" colSpan={components.length + 6}>
                  Belum ada siswa pada kelas ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="teacher-table-footer">
        <span>Rata-rata {average?.toFixed(2) ?? "—"}</span>
        <span>
          Nilai tertinggi {highest?.toFixed(2) ?? "—"} · Terendah {lowest?.toFixed(2) ?? "—"}
        </span>
      </footer>
    </section>
  );
}

export default GradeRecapSection;
