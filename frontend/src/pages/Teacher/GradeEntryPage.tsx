import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import ScoreEntriesDropdown from "./ScoreEntriesDropdown";
import type {
  GradeComponent,
  ScoreEntriesMap,
  ScoreMap,
  TeacherStudent,
  TeachingAssignment,
} from "./types";
import { calculateFinal, formatCompletionStatus } from "./utils";

interface GradeEntryPageProps {
  heading: ReactNode;
  assignmentSelector: ReactNode;
  currentAssignment: TeachingAssignment;
  components: GradeComponent[];
  filteredStudents: TeacherStudent[];
  scores: ScoreMap;
  scoreEntries: ScoreEntriesMap;
  totalWeight: number;
  hasValidWeights: boolean;
  hasUnsavedScores: boolean;
  completionCount: number;
  search: string;
  gradeStatusFilter: string;
  onSearchChange: (value: string) => void;
  onGradeStatusFilterChange: (value: string) => void;
  onDownloadTemplate: () => void;
  onImportGrades: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportGrades: () => void;
  onUpdateScoreEntries: (studentId: string, componentId: string, values: string[]) => void;
  onSaveScores: () => void;
}

function GradeEntryPage({
  heading,
  assignmentSelector,
  currentAssignment,
  components,
  filteredStudents,
  scores,
  scoreEntries,
  totalWeight,
  hasValidWeights,
  hasUnsavedScores,
  completionCount,
  search,
  gradeStatusFilter,
  onSearchChange,
  onGradeStatusFilterChange,
  onDownloadTemplate,
  onImportGrades,
  onExportGrades,
  onUpdateScoreEntries,
  onSaveScores,
}: GradeEntryPageProps) {
  const [openComponent, setOpenComponent] = useState<{
    componentId: string;
    focusStudentId: string | null;
  } | null>(null);
  const isGradeLocked = Boolean(currentAssignment.isLocked);

  const visibleStudents = filteredStudents.filter((student) => {
    if (gradeStatusFilter === "Semua status") return true;
    const finalScore = calculateFinal(student.id, components, scores);
    if (gradeStatusFilter === "Belum lengkap") return finalScore === null;
    if (finalScore === null) return false;
    return gradeStatusFilter === "Tuntas"
      ? finalScore >= currentAssignment.kkm
      : finalScore < currentAssignment.kkm;
  });

  useEffect(() => {
    if (!openComponent) return;

    function closeOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        setOpenComponent(null);
        return;
      }

      if (
        target.closest(
          ".teacher-score-entry-dropdown, .teacher-component-accordion-trigger, input, button, select, textarea, a, [role='button']",
        )
      ) {
        return;
      }

      setOpenComponent(null);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, [openComponent]);

  function toggleComponentFromHeader(componentId: string) {
    setOpenComponent((current) =>
      current?.componentId === componentId
        ? null
        : { componentId, focusStudentId: visibleStudents[0]?.id ?? null },
    );
  }

  function toggleComponentFromCell(componentId: string, studentId: string) {
    setOpenComponent((current) =>
      current?.componentId === componentId && current.focusStudentId === studentId
        ? null
        : { componentId, focusStudentId: studentId },
    );
  }

  return (
    <>
      {heading}
      <section className="teacher-card teacher-grade-context">
        <div>
          <span>Pengajaran aktif</span>
          <strong>
            {currentAssignment.subject} · Kelas {currentAssignment.className}
          </strong>
          <small>
            {currentAssignment.period} · KKM {currentAssignment.kkm}
          </small>
        </div>
        {assignmentSelector}
      </section>

      {isGradeLocked && (
        <p className="teacher-inline-warning" role="alert">
          Pengisian nilai untuk kelas ini sedang dikunci oleh Admin Sekolah. Hubungi Admin jika
          perlu melakukan revisi nilai.
        </p>
      )}
      {hasUnsavedScores && !isGradeLocked && (
        <p className="teacher-inline-warning" role="status">
          Ada perubahan nilai yang belum disimpan ke database. Klik tombol{" "}
          <strong>Simpan nilai</strong> sebelum berpindah halaman atau menutup tab.
        </p>
      )}
      {!hasValidWeights && (
        <p className="teacher-inline-warning" role="alert">
          Total bobot komponen belum 100%. Perbaiki komponen sebelum menghitung nilai akhir.
        </p>
      )}

      <section className="teacher-grade-toolbar">
        <label className="teacher-search">
          <span className="visually-hidden">Cari siswa</span>
          <input
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari nama atau NIS..."
            type="search"
            value={search}
          />
        </label>
        <div className="teacher-file-actions">
          <button
            className="teacher-secondary-button"
            onClick={onDownloadTemplate}
            type="button"
          >
            Template XLSX
          </button>
          <label className="teacher-secondary-button teacher-upload-button">
            Impor XLSX/CSV
            <input
              accept=".csv,.xlsx"
              disabled={isGradeLocked}
              onChange={onImportGrades}
              type="file"
            />
          </label>
          <button className="teacher-secondary-button" onClick={onExportGrades} type="button">
            Ekspor nilai
          </button>
        </div>
        <label className="teacher-select-label teacher-grade-status-filter">
          <select
            aria-label="Filter status ketuntasan"
            onChange={(event) => onGradeStatusFilterChange(event.target.value)}
            value={gradeStatusFilter}
          >
            <option>Semua status</option>
            <option>Tuntas</option>
            <option>Belum tuntas</option>
            <option>Belum lengkap</option>
          </select>
        </label>
      </section>

      <section className="teacher-card teacher-grade-card">
        <div className="teacher-card-heading">
          <div>
            <h2>Input Nilai Siswa</h2>
            <p>
              {completionCount} dari {currentAssignment.students.length} siswa memiliki nilai
              lengkap.
            </p>
          </div>
          <span className="teacher-total-weight">Bobot {totalWeight}%</span>
        </div>

        <div className="teacher-table-scroll">
          <table className="teacher-table">
            <thead>
              <tr>
                <th scope="col">No</th>
                <th scope="col">NIS</th>
                <th scope="col">Nama Siswa</th>
                <th scope="col">L/P</th>
                {components.map((component) => (
                  <th key={component.id} scope="col">
                    <button
                      aria-expanded={openComponent?.componentId === component.id}
                      className="teacher-component-accordion-trigger"
                      onClick={() => toggleComponentFromHeader(component.id)}
                      type="button"
                    >
                      {component.name}
                      <small>{component.weight}%</small>
                    </button>
                  </th>
                ))}
                <th scope="col">Nilai Akhir</th>
                <th scope="col">Status KKM</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student, index) => {
                const finalScore = calculateFinal(student.id, components, scores);
                return (
                  <tr key={`${currentAssignment.id}-${student.id}`}>
                    <td>{index + 1}</td>
                    <td>{student.nis}</td>
                    <td className="teacher-student-name">{student.name}</td>
                    <td>{student.gender}</td>
                    {components.map((component) => (
                      <td key={component.id}>
                        <ScoreEntriesDropdown
                          componentName={component.name}
                          disabled={isGradeLocked}
                          isOpen={openComponent?.componentId === component.id}
                          onSave={(values) =>
                            onUpdateScoreEntries(student.id, component.id, values)
                          }
                          onToggle={() => toggleComponentFromCell(component.id, student.id)}
                          shouldFocus={openComponent?.focusStudentId === student.id}
                          studentName={student.name}
                          values={
                            scoreEntries[student.id]?.[component.id] ??
                            (scores[student.id]?.[component.id] !== undefined
                              ? [scores[student.id][component.id]]
                              : [])
                          }
                        />
                      </td>
                    ))}
                    <td className="teacher-final-score">{finalScore?.toFixed(2) ?? "—"}</td>
                    <td>{formatCompletionStatus(finalScore, currentAssignment.kkm)}</td>
                  </tr>
                );
              })}
              {visibleStudents.length === 0 && (
                <tr>
                  <td className="teacher-empty" colSpan={components.length + 6}>
                    Siswa tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="teacher-table-footer">
          <span>Nilai akhir dihitung jika semua komponen terisi.</span>
          <span>Rentang nilai 0-100</span>
        </footer>
        <div className="teacher-form-actions teacher-grade-save-actions">
          <button
            className="teacher-primary-button"
            disabled={!hasValidWeights || isGradeLocked}
            onClick={onSaveScores}
            type="button"
          >
            Simpan nilai
          </button>
        </div>
      </section>
    </>
  );
}

export default GradeEntryPage;
