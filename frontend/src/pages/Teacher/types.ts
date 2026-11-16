export type TeacherRoute =
  | "dashboard"
  | "assignments"
  | "class-detail"
  | "grade-settings"
  | "grade-entry"
  | "profile";

export interface TeacherStudent {
  id: string;
  nis: string;
  name: string;
  gender: "L" | "P";
}

export interface TeachingAssignment {
  id: string;
  subject: string;
  className: string;
  period: string;
  kkm: number;
  isLocked?: boolean;
  students: TeacherStudent[];
}

export interface GradeComponent {
  id: string;
  name: string;
  weight: string;
}

export interface GradeRange {
  letter: string;
  lower: number;
  upper: number;
  description?: string;
}

export interface PeriodOption {
  id: string;
  name: string;
  isActive: boolean;
}

export type ScoreMap = Record<string, Record<string, string>>;
export type ScoreEntriesMap = Record<string, Record<string, string[]>>;

export interface TeacherPanelProps {
  route: string;
  displayName: string;
  email: string;
  onNavigate: (route: string) => void;
  onProfileChange: (name: string) => void;
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}
