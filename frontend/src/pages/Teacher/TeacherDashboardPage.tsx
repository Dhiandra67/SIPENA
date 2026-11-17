import type { ReactNode } from "react";
import type { GradeComponent, ScoreMap, TeachingAssignment } from "./types";
import { calculateFinal, initialComponents } from "./utils";

interface TeacherDashboardPageProps {
  heading: ReactNode;
  assignmentList: TeachingAssignment[];
  currentAssignment: TeachingAssignment;
  componentsByAssignment: Record<string, GradeComponent[]>;
  scores: ScoreMap;
  completionCount: number;
  onNavigate: (route: string) => void;
  onOpenAssignment: (assignmentId: string, route: string) => void;
}

function TeacherDashboardPage({
  heading,
  assignmentList,
  currentAssignment,
  componentsByAssignment,
  scores,
  completionCount,
  onNavigate,
  onOpenAssignment,
}: TeacherDashboardPageProps) {
  const studentTotal = assignmentList.reduce(
    (total, assignment) => total + assignment.students.length,
    0,
  );

  return (
    <>
      {heading}
      <section className="teacher-stat-grid" aria-label="Ringkasan pengajaran">
        <article>
          <span>Kelas Diampu</span>
          <strong>{assignmentList.length}</strong>
        </article>
        <article>
          <span>Mata Pelajaran</span>
          <strong>{new Set(assignmentList.map((item) => item.subject)).size}</strong>
        </article>
        <article>
          <span>Jumlah Siswa</span>
          <strong>{studentTotal}</strong>
        </article>
        <article>
          <span>Progres Input</span>
          <strong>
            {completionCount}/{currentAssignment.students.length}
          </strong>
          <small>{currentAssignment.className} · nilai lengkap</small>
        </article>
      </section>

      <section className="teacher-card">
        <div className="teacher-card-heading">
          <div>
            <h2>Pengajaran Saya</h2>
          </div>
          <button
            className="teacher-link-button"
            onClick={() => onNavigate("assignments")}
            type="button"
          >
            Lihat semua
          </button>
        </div>
        <div className="teacher-assignment-grid">
          {assignmentList.map((assignment) => {
            const assignmentComponents =
              componentsByAssignment[assignment.id] ?? initialComponents;
            const completed = assignment.students.filter(
              (student) => calculateFinal(student.id, assignmentComponents, scores) !== null,
            ).length;
            return (
              <article className="teacher-assignment-card" key={assignment.id}>
                <span className="teacher-assignment-icon" aria-hidden="true">
                  M
                </span>
                <div className="teacher-assignment-title">
                  <h3>{assignment.subject}</h3>
                  <span>
                    {assignment.className} · {assignment.students.length} siswa
                  </span>
                </div>
                <p>
                  KKM {assignment.kkm} <span>·</span> {completed}/{assignment.students.length}{" "}
                  nilai lengkap
                </p>
                <div className="teacher-progress">
                  <span
                    style={{
                      width: `${
                        assignment.students.length
                          ? (completed / assignment.students.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <button
                  onClick={() => onOpenAssignment(assignment.id, "class-detail")}
                  type="button"
                >
                  Buka kelas <span aria-hidden="true">→</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

    </>
  );
}

export default TeacherDashboardPage;
