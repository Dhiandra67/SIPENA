import type { PeriodOption, TeachingAssignment } from "./types";
import { sortPeriodOptions } from "./utils";

interface TeacherPageHeadingProps {
  title: string;
  description: string;
  periodList: PeriodOption[];
  selectedPeriod: string;
  fallbackPeriod: string;
  isDashboard?: boolean;
  onPeriodChange: (nextPeriod: string) => void;
}

export function TeacherPageHeading({
  title,
  description,
  periodList,
  selectedPeriod,
  fallbackPeriod,
  isDashboard = false,
  onPeriodChange,
}: TeacherPageHeadingProps) {
  return (
    <header className={`teacher-page-heading${isDashboard ? " teacher-dashboard-heading" : ""}`}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {periodList.length > 0 ? (
        <label className="teacher-select-label" style={{ minWidth: "210px" }}>
          <span>Periode Akademik</span>
          <select
            onChange={(event) => onPeriodChange(event.target.value)}
            value={selectedPeriod || fallbackPeriod}
          >
            {sortPeriodOptions(periodList).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
                {item.isActive ? " (Aktif)" : " (Arsip)"}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="teacher-period-chip">{fallbackPeriod}</span>
      )}
    </header>
  );
}

interface AssignmentSelectorProps {
  assignmentList: TeachingAssignment[];
  selectedId: string;
  onSelect: (assignmentId: string) => void;
  includeAll?: boolean;
}

export function AssignmentSelector({
  assignmentList,
  selectedId,
  onSelect,
  includeAll = false,
}: AssignmentSelectorProps) {
  return (
    <label className="teacher-select-label">
      <span>Pilih pengajaran</span>
      <select onChange={(event) => onSelect(event.target.value)} value={selectedId}>
        {includeAll && <option value="all">Semua Pengajaran</option>}
        {assignmentList.map((assignment) => (
          <option key={assignment.id} value={assignment.id}>
            {assignment.subject} · {assignment.className}
            {assignment.isLocked ? " (Terkunci)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
