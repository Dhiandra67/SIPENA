import type { ReactNode } from "react";
import GradeRecapSection from "./GradeRecapSection";
import type { GradeComponent, GradeRange, ScoreMap, TeachingAssignment } from "./types";

interface ClassDetailPageProps {
  heading: ReactNode;
  assignmentSelector: ReactNode;
  currentAssignment: TeachingAssignment;
  components: GradeComponent[];
  scores: ScoreMap;
  gradeRanges: GradeRange[];
  completionCount: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  onNavigate: (route: string) => void;
  onExportGrades: () => void;
}

function ClassDetailPage({
  heading,
  assignmentSelector,
  currentAssignment,
  components,
  scores,
  gradeRanges,
  completionCount,
  average,
  highest,
  lowest,
  onNavigate,
  onExportGrades,
}: ClassDetailPageProps) {
  return (
    <>
      {heading}
      <section className="teacher-card teacher-class-summary">
        <div className="teacher-card-heading">
          <div>
            <span className="teacher-eyebrow">DETAIL PENGAJARAN</span>
            <h2>
              {currentAssignment.subject} · Kelas {currentAssignment.className}
            </h2>
            <p>{currentAssignment.period}</p>
          </div>
          {assignmentSelector}
        </div>
        <div className="teacher-class-metrics">
          <div>
            <span>Jumlah siswa</span>
            <strong>{currentAssignment.students.length}</strong>
          </div>
          <div>
            <span>Nilai lengkap</span>
            <strong>
              {completionCount}/{currentAssignment.students.length}
            </strong>
          </div>
          <div>
            <span>Rata-rata kelas</span>
            <strong>{average?.toFixed(2) ?? "—"}</strong>
          </div>
          <div>
            <span>KKM</span>
            <strong>{currentAssignment.kkm}</strong>
          </div>
        </div>
        <div className="teacher-button-row">
          <button
            className="teacher-primary-button"
            onClick={() => onNavigate("grade-entry")}
            type="button"
          >
            Input nilai
          </button>
          <button
            className="teacher-secondary-button"
            onClick={() => onNavigate("grade-settings")}
            type="button"
          >
            Atur komponen
          </button>
        </div>
      </section>
      <GradeRecapSection
        average={average}
        components={components}
        currentAssignment={currentAssignment}
        gradeRanges={gradeRanges}
        highest={highest}
        lowest={lowest}
        onExportGrades={onExportGrades}
        scores={scores}
      />
    </>
  );
}

export default ClassDetailPage;
