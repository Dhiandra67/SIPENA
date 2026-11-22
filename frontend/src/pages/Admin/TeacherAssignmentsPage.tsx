import AdminEntityPage from "./AdminEntityPage";
import type { AdminEntityPageProps, AdminSection } from "./types";

type TeacherAssignmentsPageProps = Omit<AdminEntityPageProps, "section"> & {
  selectedClass: string;
  classOptions: string[];
  classOrder: "asc" | "desc";
  onClassChange: (value: string) => void;
  onClassOrderChange: (value: "asc" | "desc") => void;
};

export const assignmentSection: AdminSection = {
  title: "Pembagian Tugas Guru",
  description: "Plot guru, mata pelajaran, dan kelas pada periode akademik aktif.",
  addLabel: "Tambah penugasan",
  columns: [
    { key: "teacher", label: "Guru Pengampu" },
    { key: "subject", label: "Mata Pelajaran" },
    { key: "className", label: "Kelas" },
    { key: "period", label: "Periode" },
  ],
  fields: [
    { key: "teacher", label: "Guru Pengampu (pilih satu atau lebih)", type: "multiselect" },
    { key: "subject", label: "Mata pelajaran", type: "select" },
    { key: "className", label: "Kelas", type: "select" },
    { key: "period", label: "Periode", type: "select" },
  ],
  searchKeys: ["teacher", "subject", "className", "period"],
};

function TeacherAssignmentsPage({
  selectedClass,
  classOptions,
  classOrder,
  onClassChange,
  onClassOrderChange,
  ...pageProps
}: TeacherAssignmentsPageProps) {
  const toolbarFilters = (
    <div className="admin-student-filters">
      <label>
        <span className="visually-hidden">Filter kelas</span>
        <select onChange={(event) => onClassChange(event.target.value)} value={selectedClass}>
          <option>Semua Kelas</option>
          {classOptions.map((className) => (
            <option key={className}>{className}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="visually-hidden">Urutan kelas</span>
        <select
          aria-label="Urutan kelas"
          onChange={(event) => onClassOrderChange(event.target.value as "asc" | "desc")}
          value={classOrder}
        >
          <option value="asc">Urutan Kelas: VII → IX</option>
          <option value="desc">Urutan Kelas: IX → VII</option>
        </select>
      </label>
    </div>
  );

  return (
    <AdminEntityPage {...pageProps} section={assignmentSection} toolbarFilters={toolbarFilters} />
  );
}

export default TeacherAssignmentsPage;
