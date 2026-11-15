import AdminEntityPage from "./AdminEntityPage";
import type { AdminEntityPageProps, AdminSection } from "./types";

type SubjectDataPageProps = Omit<AdminEntityPageProps, "section">;

export const subjectSection: AdminSection = {
  title: "Mata Pelajaran",
  description: "Kelola daftar mata pelajaran sekolah.",
  addLabel: "Tambah mata pelajaran",
  columns: [
    { key: "code", label: "Kode" },
    { key: "name", label: "Mata Pelajaran" },
    { key: "group", label: "Kelompok" },
    { key: "status", label: "Status" },
  ],
  fields: [
    { key: "code", label: "Kode mata pelajaran" },
    { key: "name", label: "Nama mata pelajaran" },
    { key: "group", label: "Kelompok", type: "select", options: ["Umum", "Muatan Lokal"] },
    { key: "status", label: "Status", type: "select", options: ["Aktif", "Tidak aktif"] },
  ],
  searchKeys: ["code", "name", "group"],
};

function SubjectDataPage(props: SubjectDataPageProps) {
  return <AdminEntityPage {...props} section={subjectSection} />;
}

export default SubjectDataPage;
