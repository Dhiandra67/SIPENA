import AdminEntityPage from "./AdminEntityPage";
import type { AdminEntityPageProps, AdminSection } from "./types";

type TeacherAssignmentsPageProps = Omit<AdminEntityPageProps, "section">;

export const assignmentSection: AdminSection = {
  title: "Pembagian Tugas Guru",
  description: "Plot guru, mata pelajaran, dan kelas pada periode akademik aktif.",
  addLabel: "Tambah penugasan",
  columns: [
    { key: "teacher", label: "Guru" },
    { key: "subject", label: "Mata Pelajaran" },
    { key: "className", label: "Kelas" },
    { key: "period", label: "Periode" },
  ],
  fields: [
    { key: "teacher", label: "Guru", type: "select" },
    { key: "subject", label: "Mata pelajaran", type: "select" },
    { key: "className", label: "Kelas", type: "select" },
    { key: "period", label: "Periode", type: "select" },
  ],
  searchKeys: ["teacher", "subject", "className", "period"],
};

function TeacherAssignmentsPage(props: TeacherAssignmentsPageProps) {
  return <AdminEntityPage {...props} section={assignmentSection} />;
}

export default TeacherAssignmentsPage;
