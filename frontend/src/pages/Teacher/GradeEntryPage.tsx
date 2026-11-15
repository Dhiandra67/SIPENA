import type { ReactNode } from "react";
import type { TeachingAssignment } from "./types";

interface GradeEntryPageProps {
  heading: ReactNode;
  assignment: TeachingAssignment;
  assignmentSelector: ReactNode;
  completionCount: number;
  hasValidWeights: boolean;
  search: string;
  gradeStatusFilter: string;
  studentTable: ReactNode;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSaveGrades: () => void;
}

function GradeEntryPage({
  heading,
  assignment,
  assignmentSelector,
  completionCount,
  hasValidWeights,
  search,
  gradeStatusFilter,
  studentTable,
  onSearchChange,
  onStatusFilterChange,
  onSaveGrades,
}: GradeEntryPageProps) {
  const incompleteCount = assignment.students.length - completionCount;

  return (
    <>
      {heading}
      <section className="teacher-grade-assignment-banner">
        <strong>{assignment.subject} · Kelas {assignment.className}</strong>
        <span>{assignment.period}</span>
        {assignmentSelector}
      </section>
      {!hasValidWeights && <p className="teacher-inline-warning" role="alert">Total bobot komponen belum 100%. Perbaiki komponen sebelum menghitung nilai akhir.</p>}
      <section className="teacher-card teacher-grade-card">
        <div className="teacher-card-heading teacher-grade-heading">
          <div><h2>Input Nilai Siswa</h2><p>Buka dropdown pada nilai untuk menambahkan atau mengubah nilai komponen.</p></div>
          <div className="teacher-grade-completion">
            <strong>{completionCount} dari {assignment.students.length} lengkap</strong>
            <span>{incompleteCount} belum lengkap</span>
          </div>
        </div>
        <div className="teacher-grade-toolbar">
          <label className="teacher-search"><span className="visually-hidden">Cari nama atau nomor siswa</span><input onChange={(event) => onSearchChange(event.target.value)} placeholder="Cari nama atau nomor siswa" type="search" value={search} /></label>
          <label className="teacher-grade-status">
            <span className="visually-hidden">Filter status nilai</span>
            <select onChange={(event) => onStatusFilterChange(event.target.value)} value={gradeStatusFilter}>
              <option>Semua status</option>
              <option>Lengkap</option>
              <option>Belum lengkap</option>
            </select>
          </label>
        </div>
        <div className="teacher-grade-table-scroll">
          {studentTable}
        </div>
      </section>
      <div className="teacher-grade-save-row">
        <button className="teacher-primary-button" disabled={!hasValidWeights} onClick={onSaveGrades} type="button">Simpan Nilai</button>
        <span>Nilai hanya dapat diubah pada pengajaran yang ditugaskan kepada Anda.</span>
      </div>
    </>
  );
}

export default GradeEntryPage;
