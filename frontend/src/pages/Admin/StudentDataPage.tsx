import AdminEntityPage from "./AdminEntityPage";
import type { AdminEntityPageProps, AdminSection } from "./types";

type StudentDataPageProps = Omit<AdminEntityPageProps, "section"> & {
  selectedClass: string;
  classOptions: string[];
  onClassChange: (value: string) => void;
};

export const studentSection: AdminSection = {
  title: "Data Siswa",
  description: "Kelola siswa dan keanggotaan kelas untuk periode aktif.",
  addLabel: "Tambah siswa",
  columns: [
    { key: "nis", label: "NIS" },
    { key: "name", label: "Nama Siswa" },
    { key: "className", label: "Kelas" },
    { key: "gender", label: "L/P" },
    { key: "status", label: "Status" },
  ],
  fields: [
    { key: "nis", label: "NIS" },
    { key: "nisn", label: "NISN" },
    { key: "name", label: "Nama lengkap" },
    { key: "gender", label: "Jenis kelamin", type: "select", options: ["L", "P"] },
    { key: "className", label: "Kode kelas", type: "select" },
    { key: "status", label: "Status", type: "select", options: ["Aktif", "Nonaktif"] },
  ],
  searchKeys: ["nis", "nisn", "name", "className"],
};

function StudentDataPage({
  selectedClass,
  classOptions,
  onClassChange,
  ...pageProps
}: StudentDataPageProps) {
  const toolbarFilters = (
    <div className="admin-student-filters">
      <label>
        <span className="visually-hidden">Filter kelas</span>
        <select onChange={(event) => onClassChange(event.target.value)} value={selectedClass}>
          <option>Semua Kelas</option>
          {classOptions.map((className) => <option key={className}>{className}</option>)}
        </select>
      </label>
    </div>
  );

  return <AdminEntityPage {...pageProps} section={studentSection} toolbarFilters={toolbarFilters} />;
}

export default StudentDataPage;
