import type { ReactNode } from "react";
import type { GradeComponent, ScoreMap, TeachingAssignment } from "./types";
import { calculateFinal } from "./utils";

interface DashboardPageProps {
  heading: ReactNode;
  assignments: TeachingAssignment[];
  currentAssignment: TeachingAssignment;
  completionCount: number;
  componentsByAssignment: Record<string, GradeComponent[]>;
  initialComponents: GradeComponent[];
  scores: ScoreMap;
  kkmByAssignment: Record<string, string>;
  onNavigate: (route: string) => void;
  onOpenAssignment: (assignmentId: string, route: string) => void;
}

function DashboardPage({
  heading,
  assignments,
  currentAssignment,
  completionCount,
  componentsByAssignment,
  initialComponents,
  scores,
  kkmByAssignment,
  onNavigate,
  onOpenAssignment,
}: DashboardPageProps) {
  const studentTotal = assignments.reduce((total, assignment) => total + assignment.students.length, 0);

  return (
    <>
      {heading}
      <section className="teacher-stat-grid" aria-label="Ringkasan pengajaran">
        <article><span>Kelas Diampu</span><strong>{assignments.length}</strong><small>Periode aktif</small></article>
        <article><span>Mata Pelajaran</span><strong>{new Set(assignments.map((item) => item.subject)).size}</strong><small>Pengajaran aktif</small></article>
        <article><span>Jumlah Siswa</span><strong>{studentTotal}</strong><small>Di seluruh kelas</small></article>
        <article><span>Progres Input</span><strong>{completionCount}/{currentAssignment.students.length}</strong><small>{currentAssignment.className} · nilai lengkap</small></article>
      </section>

      <section className="teacher-academic-banner">
        <div><span>Periode akademik aktif</span><strong>{currentAssignment.period}</strong></div>
        <span className="teacher-status-chip">Aktif</span>
      </section>

      <section className="teacher-card">
        <div className="teacher-card-heading">
          <div><h2>Pengajaran Saya</h2><p>Pilih kelas untuk membuka detail, input nilai, atau mengatur komponen.</p></div>
          <button className="teacher-link-button" onClick={() => onNavigate("assignments")} type="button">Lihat semua</button>
        </div>
        <div className="teacher-assignment-grid">
          {assignments.map((assignment) => {
            const assignmentComponents = componentsByAssignment[assignment.id] ?? initialComponents;
            const completed = assignment.students.filter(
              (student) => calculateFinal(student.id, assignmentComponents, scores) !== null,
            ).length;
            return (
              <article className="teacher-assignment-card" key={assignment.id}>
                <span className="teacher-assignment-icon" aria-hidden="true">M</span>
                <div className="teacher-assignment-title">
                  <h3>{assignment.subject}</h3>
                  <span>{assignment.className} · {assignment.students.length} siswa</span>
                </div>
                <p>KKM {kkmByAssignment[assignment.id] ?? assignment.kkm} <span>·</span> {completed}/{assignment.students.length} nilai lengkap</p>
                <div className="teacher-progress"><span style={{ width: `${(completed / assignment.students.length) * 100}%` }} /></div>
                <button onClick={() => onOpenAssignment(assignment.id, "class-detail")} type="button">Buka kelas <span aria-hidden="true">→</span></button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="teacher-card teacher-dashboard-actions">
        <div className="teacher-card-heading"><div><h2>Akses cepat</h2><p>Lanjutkan pekerjaan penilaian Anda.</p></div></div>
        <div className="teacher-action-grid">
          <button onClick={() => onNavigate("grade-settings")} type="button"><strong>01</strong><span>Atur komponen &amp; bobot</span><small>Pastikan jumlah bobot 100%</small></button>
          <button onClick={() => onNavigate("grade-entry")} type="button"><strong>02</strong><span>Input dan kelola nilai</span><small>Nilai akhir dihitung otomatis</small></button>
        </div>
      </section>
    </>
  );
}

export default DashboardPage;
