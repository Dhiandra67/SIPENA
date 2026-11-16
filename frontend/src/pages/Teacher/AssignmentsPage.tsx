import type { ReactNode } from "react";
import type { GradeComponent, ScoreMap, TeachingAssignment } from "./types";
import { calculateFinal, initialComponents } from "./utils";

interface AssignmentsPageProps {
  heading: ReactNode;
  assignmentList: TeachingAssignment[];
  componentsByAssignment: Record<string, GradeComponent[]>;
  scores: ScoreMap;
  onOpenAssignment: (assignmentId: string, route: string) => void;
}

function AssignmentsPage({
  heading,
  assignmentList,
  componentsByAssignment,
  scores,
  onOpenAssignment,
}: AssignmentsPageProps) {
  return (
    <>
      {heading}
      <section className="teacher-assignment-grid teacher-assignment-list">
        {assignmentList.map((assignment) => {
          const assignmentComponents =
            componentsByAssignment[assignment.id] ?? initialComponents;
          const completed = assignment.students.filter(
            (student) => calculateFinal(student.id, assignmentComponents, scores) !== null,
          ).length;
          return (
            <article className="teacher-assignment-card" key={assignment.id}>
              <div className="teacher-assignment-title">
                <span className="teacher-assignment-icon" aria-hidden="true">
                  M
                </span>
                <div>
                  <h2>{assignment.subject}</h2>
                  <span>Kelas {assignment.className}</span>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Periode</dt>
                  <dd>{assignment.period}</dd>
                </div>
                <div>
                  <dt>Jumlah siswa</dt>
                  <dd>{assignment.students.length} siswa</dd>
                </div>
                <div>
                  <dt>KKM</dt>
                  <dd>{assignment.kkm}</dd>
                </div>
              </dl>
              <div className="teacher-progress-label">
                <span>Progres nilai</span>
                <strong>
                  {completed}/{assignment.students.length}
                </strong>
              </div>
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
                Detail kelas <span aria-hidden="true">→</span>
              </button>
            </article>
          );
        })}
      </section>
    </>
  );
}

export default AssignmentsPage;
