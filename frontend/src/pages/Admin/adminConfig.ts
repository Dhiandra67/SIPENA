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
    { id: "s1", nis: "2026001", nisn: "0123456701", name: "Andi Pratama", gender: "L", className: "VII-A", status: "Aktif" },
    { id: "s2", nis: "2026002", nisn: "0123456702", name: "Budi Santoso", gender: "L", className: "VII-A", status: "Aktif" },
    { id: "s3", nis: "2026003", nisn: "0123456703", name: "Citra Lestari", gender: "P", className: "VII-B", status: "Aktif" },
    { id: "s4", nis: "2026004", nisn: "0123456704", name: "Dina Putri", gender: "P", className: "VIII-A", status: "Aktif" },
    { id: "s5", nis: "2026005", nisn: "0123456705", name: "Eka Saputra", gender: "L", className: "VII-B", status: "Aktif" },
    { id: "s6", nis: "2026006", nisn: "0123456706", name: "Fitri Handayani", gender: "P", className: "VIII-A", status: "Aktif" },
    { id: "s7", nis: "2026007", nisn: "0123456707", name: "Galih Ramadhan", gender: "L", className: "VII-A", status: "Aktif" },
    { id: "s8", nis: "2026008", nisn: "0123456708", name: "Hana Permata", gender: "P", className: "VIII-B", status: "Aktif" },
  ],
  teachers: [
    { id: "t1", nip: "198501012010011001", name: "Sari Wulandari, S.Pd.", gender: "P", email: "sari@sekolah.sch.id", status: "Aktif" },
    { id: "t2", nip: "198702152012021002", name: "Dedi Saputra, S.Pd.", gender: "L", email: "dedi@sekolah.sch.id", status: "Aktif" },
    { id: "t3", nip: "199003102015031003", name: "Ratna Dewi, S.Pd.", gender: "P", email: "ratna@sekolah.sch.id", status: "Aktif" },
  ],
  classes: [
    { id: "k1", code: "VII-A", name: "VII-A", level: "VII", homeroom: "Sari Wulandari, S.Pd.", period: activePeriod, students: "3" },
    { id: "k2", code: "VII-B", name: "VII-B", level: "VII", homeroom: "Dedi Saputra, S.Pd.", period: activePeriod, students: "2" },
    { id: "k3", code: "VIII-A", name: "VIII-A", level: "VIII", homeroom: "Ratna Dewi, S.Pd.", period: activePeriod, students: "2" },
    { id: "k4", code: "VIII-B", name: "VIII-B", level: "VIII", homeroom: "Sari Wulandari, S.Pd.", period: activePeriod, students: "1" },
  ],
  subjects: [
    { id: "m1", code: "MAT", name: "Matematika", group: "Umum", status: "Aktif" },
    { id: "m2", code: "BIN", name: "Bahasa Indonesia", group: "Umum", status: "Aktif" },
    { id: "m3", code: "IPA", name: "Ilmu Pengetahuan Alam", group: "Umum", status: "Aktif" },
    { id: "m4", code: "IPS", name: "Ilmu Pengetahuan Sosial", group: "Umum", status: "Aktif" },
    { id: "m5", code: "SBD", name: "Seni Budaya", group: "Muatan Lokal", status: "Aktif" },
  ],
  assignments: [
    { id: "a1", teacher: "Sari Wulandari, S.Pd.", subject: "Matematika", className: "VII-A", period: activePeriod },
    { id: "a2", teacher: "Dedi Saputra, S.Pd.", subject: "Bahasa Indonesia", className: "VII-B", period: activePeriod },
    { id: "a3", teacher: "Ratna Dewi, S.Pd.", subject: "Ilmu Pengetahuan Alam", className: "VIII-A", period: activePeriod },
  ],
};

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
      (classRecord) => classRecord.period === currentPeriod,
    );
    const source = activeClasses.length > 0 ? activeClasses : records.classes;
    return Array.from(new Set(source.map((classRecord) => classRecord.code)));
  }
  if (fieldKey === "period") return periodOptions;
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
  if (currentRoute === "assignments") {
    const duplicate = existing.some(
      (record) =>
        record.teacher === candidate.teacher &&
        record.subject === candidate.subject &&
        record.className === candidate.className &&
        record.period === candidate.period,
    );
    if (duplicate) {
      return "Penugasan guru, mata pelajaran, kelas, dan periode tersebut sudah ada.";
    }
  }
  return "";
}
