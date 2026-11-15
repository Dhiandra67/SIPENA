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
  students: TeacherStudent[];
  isHomeroom: boolean;
}

export interface GradeComponent {
  id: string;
  name: string;
  weight: string;
}

export type ScoreMap = Record<string, Record<string, string>>;
