import AdminEntityPage from "./AdminEntityPage";
import type { AdminEntityPageProps, AdminSection } from "./types";

type ClassDataPageProps = Omit<AdminEntityPageProps, "section">;

export const classSection: AdminSection = {
  title: "Data Kelas",
  description: "Kelola rombongan belajar dan wali kelas pada periode aktif.",
  addLabel: "Tambah kelas",
  mobileVisibleColumns: ["name", "homeroom"],
  columns: [
    { key: "code", label: "Kode Kelas" },
    { key: "name", label: "Nama Kelas" },
    { key: "level", label: "Tingkat" },
    { key: "homeroom", label: "Wali Kelas" },
    { key: "period", label: "Periode" },
    { key: "students", label: "Jumlah Siswa" },
  ],
  fields: [
    { key: "code", label: "Kode kelas" },
    { key: "name", label: "Nama kelas" },
    { key: "level", label: "Tingkat", type: "select", options: ["VII", "VIII", "IX"] },
    { key: "homeroom", label: "Wali kelas", type: "select" },
    { key: "period", label: "Periode akademik", type: "select" },
  ],
  searchKeys: ["code", "name", "level", "homeroom"],
};

function ClassDataPage(props: ClassDataPageProps) {
  return <AdminEntityPage {...props} section={classSection} />;
}

export default ClassDataPage;
