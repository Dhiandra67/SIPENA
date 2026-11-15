import AdminEntityPage from "./AdminEntityPage";
import type { AdminEntityPageProps, AdminSection } from "./types";

type TeacherDataPageProps = Omit<AdminEntityPageProps, "section">;

export const teacherSection: AdminSection = {
  title: "Data Guru",
  description: "Kelola profil guru dan informasi akun sekolah.",
  addLabel: "Tambah guru",
  columns: [
    { key: "nip", label: "NIP" },
    { key: "name", label: "Nama Guru" },
    { key: "email", label: "Email" },
    { key: "status", label: "Status" },
  ],
  fields: [
    { key: "nip", label: "NIP" },
    { key: "name", label: "Nama lengkap" },
    { key: "gender", label: "Jenis kelamin", type: "select", options: ["L", "P"] },
    { key: "email", label: "Email akun", type: "email" },
    { key: "status", label: "Status akun", type: "select", options: ["Aktif", "Tidak aktif"] },
  ],
  searchKeys: ["nip", "name", "email"],
};

function TeacherDataPage(props: TeacherDataPageProps) {
  return <AdminEntityPage {...props} section={teacherSection} />;
}

export default TeacherDataPage;
