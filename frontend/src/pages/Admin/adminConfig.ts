import { classSection } from "./ClassDataPage";
import { studentSection } from "./StudentDataPage";
import { subjectSection } from "./SubjectDataPage";
import { assignmentSection } from "./TeacherAssignmentsPage";
import { teacherSection } from "./TeacherDataPage";
import type { AdminRecord, AdminRoute, AdminSection } from "./types";

export const endpointByRoute: Record<AdminRoute, string> = {
  students: "/v1/siswa",
  teachers: "/v1/guru",
  classes: "/v1/kelas",
  subjects: "/v1/mapel",
  assignments: "/v1/pengajaran",
};

export type RecordSet = Record<AdminRoute, AdminRecord[]>;

export interface OverviewPayload extends RecordSet {
  academic?: AdminRecord[];
  grades?: AdminRecord[];
}

export const activePeriod = "2026/2027 · Ganjil";

export const sections: Record<AdminRoute, AdminSection> = {
  students: studentSection,
  teachers: teacherSection,
  classes: classSection,
  subjects: subjectSection,
  assignments: assignmentSection,
};

export const initialRecords: RecordSet = {
  students: [
    { id: "s1", nis: "2026001", nisn: "0123456701", name: "Andi Pratama", gender: "L", className: "VII-A", status: "Aktif", period: activePeriod },
    { id: "s2", nis: "2026002", nisn: "0123456702", name: "Budi Santoso", gender: "L", className: "VII-A", status: "Aktif", period: activePeriod },
    { id: "s3", nis: "2026003", nisn: "0123456703", name: "Citra Lestari", gender: "P", className: "VII-B", status: "Aktif", period: activePeriod },
    { id: "s4", nis: "2026004", nisn: "0123456704", name: "Dina Putri", gender: "P", className: "VIII-A", status: "Aktif", period: activePeriod },
    { id: "s5", nis: "2026005", nisn: "0123456705", name: "Eka Saputra", gender: "L", className: "VII-B", status: "Aktif", period: activePeriod },
    { id: "s6", nis: "2026006", nisn: "0123456706", name: "Fitri Handayani", gender: "P", className: "VIII-A", status: "Aktif", period: activePeriod },
    { id: "s7", nis: "2026007", nisn: "0123456707", name: "Galih Ramadhan", gender: "L", className: "VII-A", status: "Aktif", period: activePeriod },
    { id: "s8", nis: "2026008", nisn: "0123456708", name: "Hana Permata", gender: "P", className: "VIII-B", status: "Aktif", period: activePeriod },
  ],
  teachers: [
    { id: "t1", nip: "198501012010011001", name: "Sari Wulandari, S.Pd.", gender: "P", email: "sari@sekolah.sch.id", status: "Aktif", period: activePeriod },
    { id: "t2", nip: "198702152012021002", name: "Dedi Saputra, S.Pd.", gender: "L", email: "dedi@sekolah.sch.id", status: "Aktif", period: activePeriod },
    { id: "t3", nip: "199003102015031003", name: "Ratna Dewi, S.Pd.", gender: "P", email: "ratna@sekolah.sch.id", status: "Aktif", period: activePeriod },
  ],
  classes: [
    { id: "k1", code: "VII-A", name: "VII-A", level: "VII", homeroom: "Sari Wulandari, S.Pd.", period: activePeriod, students: "3" },
    { id: "k2", code: "VII-B", name: "VII-B", level: "VII", homeroom: "Dedi Saputra, S.Pd.", period: activePeriod, students: "2" },
    { id: "k3", code: "VIII-A", name: "VIII-A", level: "VIII", homeroom: "Ratna Dewi, S.Pd.", period: activePeriod, students: "2" },
    { id: "k4", code: "VIII-B", name: "VIII-B", level: "VIII", homeroom: "Sari Wulandari, S.Pd.", period: activePeriod, students: "1" },
  ],
  subjects: [
    { id: "m1", code: "MAT", name: "Matematika", group: "Umum", status: "Aktif", period: activePeriod },
    { id: "m2", code: "BIN", name: "Bahasa Indonesia", group: "Umum", status: "Aktif", period: activePeriod },
    { id: "m3", code: "IPA", name: "Ilmu Pengetahuan Alam", group: "Umum", status: "Aktif", period: activePeriod },
    { id: "m4", code: "IPS", name: "Ilmu Pengetahuan Sosial", group: "Umum", status: "Aktif", period: activePeriod },
    { id: "m5", code: "SBD", name: "Seni Budaya", group: "Muatan Lokal", status: "Aktif", period: activePeriod },
  ],
  assignments: [
    { id: "a1", teacher: "Sari Wulandari, S.Pd.", subject: "Matematika", className: "VII-A", period: activePeriod },
    { id: "a2", teacher: "Dedi Saputra, S.Pd.", subject: "Bahasa Indonesia", className: "VII-B", period: activePeriod },
    { id: "a3", teacher: "Ratna Dewi, S.Pd.", subject: "Ilmu Pengetahuan Alam", className: "VIII-A", period: activePeriod },
  ],
};

const romanLevelOrder: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
};

export function comparePeriodNames(a: string, b: string): number {
  const parsePeriod = (value: string) => {
    const yearMatch = value.match(/(\d{4})\/(\d{4})/);
    const startYear = yearMatch ? Number(yearMatch[1]) : Number.MAX_SAFE_INTEGER;
    const endYear = yearMatch ? Number(yearMatch[2]) : Number.MAX_SAFE_INTEGER;
    const lower = value.toLocaleLowerCase("id");
    const semesterOrder = lower.includes("ganjil") ? 1 : lower.includes("genap") ? 2 : 3;
    return { startYear, endYear, semesterOrder };
  };
  const parsedA = parsePeriod(a);
  const parsedB = parsePeriod(b);
  if (parsedA.startYear !== parsedB.startYear) return parsedA.startYear - parsedB.startYear;
  if (parsedA.endYear !== parsedB.endYear) return parsedA.endYear - parsedB.endYear;
  if (parsedA.semesterOrder !== parsedB.semesterOrder) {
    return parsedA.semesterOrder - parsedB.semesterOrder;
  }
  return a.localeCompare(b, "id");
}

export function sortPeriodNames(periods: string[]): string[] {
  return Array.from(new Set(periods)).sort(comparePeriodNames);
}

export function compareClassCodes(a: string, b: string): number {
  const parseClass = (value: string) => {
    const normalized = value.trim().toUpperCase();
    const match = normalized.match(/^([IVX]+|\d+)\b[\s-]*(.*)$/);
    if (!match) {
      return { level: Number.MAX_SAFE_INTEGER, suffix: normalized };
    }
    const rawLevel = match[1];
    const level =
      romanLevelOrder[rawLevel] ??
      (Number.isFinite(Number(rawLevel)) ? Number(rawLevel) : Number.MAX_SAFE_INTEGER);
    return { level, suffix: match[2] || normalized };
  };
  const parsedA = parseClass(a);
  const parsedB = parseClass(b);
  if (parsedA.level !== parsedB.level) return parsedA.level - parsedB.level;
  return parsedA.suffix.localeCompare(parsedB.suffix, "id", { numeric: true });
}

export function isAdminRoute(route: string): route is AdminRoute {
  return Object.prototype.hasOwnProperty.call(sections, route);
}

export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function derivePeriodDates(
  year: string,
  semester: string,
): { startDate: string; endDate: string } {
  const [startYearRaw, endYearRaw] = year.split("/");
  const startYear = Number(startYearRaw) || new Date().getFullYear();
  const endYear = Number(endYearRaw) || startYear + 1;
  if (semester.toLowerCase() === "genap") {
    return {
      startDate: `${endYear}-01-02`,
      endDate: `${endYear}-06-30`,
    };
  }
  return {
    startDate: `${startYear}-07-01`,
    endDate: `${startYear}-12-31`,
  };
}

export function getFieldOptions(
  fieldKey: string,
  records: RecordSet,
  currentPeriod: string,
  periodOptions: string[],
): string[] {
  if (fieldKey === "homeroom" || fieldKey === "teacher") {
    return records.teachers.map((teacher) => teacher.name);
  }
  if (fieldKey === "subject") return records.subjects.map((subject) => subject.name);
  if (fieldKey === "className" || fieldKey === "code") {
    const activeClasses = records.classes.filter(
      (classRecord) => !classRecord.period || classRecord.period === currentPeriod,
    );
    return Array.from(new Set(activeClasses.map((classRecord) => classRecord.code))).sort(
      compareClassCodes,
    );
  }
  if (fieldKey === "period") return sortPeriodNames(periodOptions);
  return [];
}

export function validateAdminRecord(
  candidate: AdminRecord,
  currentRoute: AdminRoute | null,
  section: AdminSection | null,
  records: RecordSet,
  selectedRecord: AdminRecord | null,
): string {
  if (!currentRoute || !section) return "Halaman tidak ditemukan.";
  const existing = records[currentRoute].filter((record) => record.id !== selectedRecord?.id);
  const uniqueFields =
    currentRoute === "students"
      ? ["nis", "nisn"]
      : currentRoute === "teachers"
        ? ["nip", "email"]
        : currentRoute === "subjects"
          ? ["code"]
          : [];
  for (const key of uniqueFields) {
    if (
      candidate[key] &&
      existing.some(
        (record) => record[key]?.toLocaleLowerCase("id") === candidate[key].toLocaleLowerCase("id"),
      )
    ) {
      return `${section.fields.find((field) => field.key === key)?.label ?? key} sudah digunakan.`;
    }
  }
  if (currentRoute === "classes") {
    const duplicateClass = existing.some(
      (record) =>
        record.code?.toLocaleLowerCase("id") === candidate.code?.toLocaleLowerCase("id") &&
        (!record.period || !candidate.period || record.period === candidate.period),
    );
    if (duplicateClass) {
      return "Kode kelas sudah digunakan.";
    }
  }
  if (
    currentRoute === "students" &&
    !records.classes.some((classRecord) => classRecord.code === candidate.className)
  ) {
    return "Pilih kelas yang terdaftar.";
  }
  return "";
}
