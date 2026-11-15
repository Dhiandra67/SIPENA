import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import ClassDataPage, { classSection } from "./ClassDataPage";
import ClassGradesPage from "./ClassGradesPage";
import DashboardPage from "./DashboardPage";
import StudentDataPage, { studentSection } from "./StudentDataPage";
import SubjectDataPage, { subjectSection } from "./SubjectDataPage";
import TeacherAssignmentsPage, { assignmentSection } from "./TeacherAssignmentsPage";
import TeacherDataPage, { teacherSection } from "./TeacherDataPage";
import { downloadSpreadsheet } from "./spreadsheet";
import type { AdminRecord, AdminRoute, AdminSection } from "./types";
import "./AdminPanel.css";

type RecordSet = Record<AdminRoute, AdminRecord[]>;

const activePeriod = "2026/2027 · Ganjil";
const sections: Record<AdminRoute, AdminSection> = {
  students: studentSection,
  teachers: teacherSection,
  classes: classSection,
  subjects: subjectSection,
  assignments: assignmentSection,
};

const initialRecords: RecordSet = {
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

interface AdminPanelProps {
  route: string;
  onNavigate: (route: string) => void;
}

function isAdminRoute(route: string): route is AdminRoute {
  return Object.prototype.hasOwnProperty.call(sections, route);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AdminPanel({ route, onNavigate }: AdminPanelProps) {
  const [records, setRecords] = useState<RecordSet>(initialRecords);
  const [currentPeriod, setCurrentPeriod] = useState(activePeriod);
  const [periodOptions, setPeriodOptions] = useState([activePeriod]);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Semua Kelas");
  const [selectedGradeClass, setSelectedGradeClass] = useState<AdminRecord | null>(initialRecords.classes[0]);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "details" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const currentRoute = isAdminRoute(route) ? route : null;
  const section = currentRoute ? sections[currentRoute] : null;
  const rows = currentRoute ? records[currentRoute] : [];
  const visibleRows = useMemo(() => {
    if (!section || !currentRoute) return [];
    const query = search.trim().toLocaleLowerCase("id");
    return rows.filter((record) => {
      const matchesSearch = !query || section.searchKeys.some((key) =>
        record[key]?.toLocaleLowerCase("id").includes(query),
      );
      return matchesSearch &&
        (currentRoute !== "students" || selectedClass === "Semua Kelas" || record.className === selectedClass);
    });
  }, [currentRoute, rows, search, section, selectedClass]);

  function navigate(nextRoute: string) {
    setSearch("");
    setSelectedClass("Semua Kelas");
    setNotice("");
    onNavigate(nextRoute);
  }

  function openForm(mode: "create" | "edit" | "details", record: AdminRecord | null = null) {
    setSelectedRecord(record);
    setDialogMode(mode);
    setFormError("");
  }

  function closeForm() {
    setDialogMode(null);
    setSelectedRecord(null);
    setFormError("");
  }

  function getOptions(fieldKey: string): string[] {
    if (fieldKey === "homeroom" || fieldKey === "teacher") {
      return records.teachers.map((teacher) => teacher.name);
    }
    if (fieldKey === "subject") return records.subjects.map((subject) => subject.name);
    if (fieldKey === "className" || fieldKey === "code") {
      return records.classes.map((classRecord) => classRecord.code);
    }
    if (fieldKey === "period") return periodOptions;
    return [];
  }

  function validate(candidate: AdminRecord): string {
    if (!currentRoute || !section) return "Halaman tidak ditemukan.";
    const existing = records[currentRoute].filter((record) => record.id !== selectedRecord?.id);
    const uniqueFields = currentRoute === "students"
      ? ["nis", "nisn"]
      : currentRoute === "teachers"
        ? ["nip", "email"]
        : currentRoute === "classes" || currentRoute === "subjects"
          ? ["code"]
          : [];
    for (const key of uniqueFields) {
      if (candidate[key] && existing.some((record) => record[key]?.toLocaleLowerCase("id") === candidate[key].toLocaleLowerCase("id"))) {
        return `${section.fields.find((field) => field.key === key)?.label ?? key} sudah digunakan.`;
      }
    }
    if (currentRoute === "students" && !records.classes.some((classRecord) => classRecord.code === candidate.className)) {
      return "Pilih kelas yang terdaftar.";
    }
    if (currentRoute === "assignments") {
      const duplicate = existing.some((record) =>
        record.teacher === candidate.teacher &&
        record.subject === candidate.subject &&
        record.className === candidate.className &&
        record.period === candidate.period,
      );
      if (duplicate) return "Penugasan guru, mata pelajaran, kelas, dan periode tersebut sudah ada.";
    }
    return "";
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentRoute || !section) return;
    const formData = new FormData(event.currentTarget);
    const candidate: AdminRecord = Object.fromEntries(
      section.fields.map((field) => [field.key, String(formData.get(field.key) ?? "").trim()]),
    );
    const validationMessage = validate(candidate);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const record = { ...candidate, id: selectedRecord?.id ?? createId() };
    setRecords((previous) => ({
      ...previous,
      [currentRoute]: dialogMode === "edit"
        ? previous[currentRoute].map((item) => item.id === record.id ? record : item)
        : [...previous[currentRoute], record],
    }));
    setNotice(dialogMode === "edit" ? "Perubahan berhasil disimpan." : "Data berhasil ditambahkan.");
    closeForm();
  }

  function deleteRecord(record: AdminRecord) {
    if (!currentRoute) return;
    const inUse =
      (currentRoute === "classes" &&
        (records.students.some((student) => student.className === record.code) ||
          records.assignments.some((assignment) => assignment.className === record.code))) ||
      (currentRoute === "teachers" &&
        (records.classes.some((classRecord) => classRecord.homeroom === record.name) ||
          records.assignments.some((assignment) => assignment.teacher === record.name))) ||
      (currentRoute === "subjects" && records.assignments.some((assignment) => assignment.subject === record.name));
    if (inUse) {
      setNotice("Data masih digunakan. Hapus atau pindahkan relasinya terlebih dahulu.");
      return;
    }
    if (!window.confirm(`Hapus data "${record.name ?? record.code ?? record.nis ?? ""}"?`)) return;
    setRecords((previous) => ({
      ...previous,
      [currentRoute]: previous[currentRoute].filter((item) => item.id !== record.id),
    }));
    setNotice("Data berhasil dihapus.");
  }

  function addPeriod(year: string, semester: string) {
    if (!/^\d{4}\/\d{4}$/.test(year)) {
      setNotice("Gunakan format tahun ajaran YYYY/YYYY.");
      return;
    }
    const period = `${year} · ${semester}`;
    if (periodOptions.includes(period)) {
      setNotice("Periode tersebut sudah terdaftar.");
      return;
    }
    setPeriodOptions((previous) => [...previous, period]);
    setCurrentPeriod(period);
    setNotice("Periode akademik berhasil ditambahkan dan diaktifkan.");
  }

  async function exportStudents() {
    const headers = ["NIS", "NISN", "Nama Lengkap", "Jenis Kelamin (L/P)", "Kode Kelas", "Status"];
    const dataRows = records.students.map((student) => [
      student.nis, student.nisn, student.name, student.gender, student.className, student.status,
    ]);
    try {
      await downloadSpreadsheet("data-siswa-sipena.xlsx", [headers, ...dataRows], "Data Siswa");
      setNotice("Data siswa berhasil diekspor.");
    } catch (error) {
      console.error("Failed to export students.", error);
      setNotice("Data siswa tidak dapat diekspor. Silakan coba lagi.");
    }
  }

  async function importStudents(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name)) {
      setNotice("Pilih file .xlsx atau .csv berukuran maksimal 5 MB.");
      return;
    }
    try {
      const XLSX = await import("@e965/xlsx/dist/xlsx.mini.min.js").then((module) => module.default);
      const workbook = file.name.toLowerCase().endsWith(".csv")
        ? XLSX.read(await file.text(), { type: "string" })
        : XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        setNotice("File tidak memiliki lembar kerja.");
        return;
      }
      const imported = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false })
        .slice(1)
        .filter((row) => row.some((value) => String(value).trim()))
        .map((row) => ({
          id: createId(),
          nis: String(row[0] ?? "").trim(),
          nisn: String(row[1] ?? "").trim(),
          name: String(row[2] ?? "").trim(),
          gender: String(row[3] ?? "").trim().toUpperCase(),
          className: String(row[4] ?? "").trim(),
          status: String(row[5] ?? "Aktif").trim() || "Aktif",
        }));
      if (imported.some((student) => !student.nis || !student.name || !records.classes.some((item) => item.code === student.className))) {
        setNotice("Impor dibatalkan: setiap baris harus berisi NIS, nama, dan kode kelas yang terdaftar.");
        return;
      }
      setRecords((previous) => ({ ...previous, students: [...previous.students, ...imported] }));
      setNotice(`${imported.length} data siswa berhasil diimpor.`);
    } catch (error) {
      console.error("Failed to import students.", error);
      setNotice("File siswa tidak dapat dibaca. Periksa format dan coba lagi.");
    }
  }

  if (route === "dashboard") {
    const classes = records.classes.filter((classRecord) => classRecord.period === currentPeriod);
    return (
      <>
        <DashboardPage
          classes={classes}
          currentPeriod={currentPeriod}
          notice={notice}
          onCreatePeriod={addPeriod}
          onPeriodChange={setCurrentPeriod}
          onViewGrades={(classRecord) => {
            setSelectedGradeClass(classRecord);
            navigate("grades");
          }}
          periodOptions={periodOptions}
          totalClasses={classes.length}
          totalStudents={records.students.length}
          totalSubjects={records.subjects.length}
          totalTeachers={records.teachers.length}
        />
      </>
    );
  }

  if (route === "grades" && selectedGradeClass) {
    const gradeClasses = records.classes.filter((classRecord) => classRecord.period === currentPeriod);
    return (
      <ClassGradesPage
        classRecord={selectedGradeClass}
        classes={gradeClasses}
        onClassChange={(classId) => {
          setSelectedGradeClass(gradeClasses.find((classRecord) => classRecord.id === classId) ?? null);
        }}
        onNavigate={navigate}
        period={currentPeriod}
        students={records.students.filter((student) => student.className === selectedGradeClass.code)}
        subjects={records.subjects}
      />
    );
  }

  if (!currentRoute || !section) {
    return <p className="admin-notice" role="status">Halaman admin tidak ditemukan.</p>;
  }

  const classOptions = [...new Set(records.classes.map((classRecord) => classRecord.code))];
  const commonProps = {
    currentPeriod,
    rows,
    visibleRows,
    search,
    onSearchChange: setSearch,
    onAdd: () => openForm("create"),
    onDetails: (record: AdminRecord) => openForm("details", record),
    onEdit: (record: AdminRecord) => openForm("edit", record),
    onDelete: deleteRecord,
  };
  const fileActions = currentRoute === "students" ? (
    <div className="admin-file-actions">
      <label className="admin-secondary-button admin-file-button">
        Impor
        <input accept=".csv,.xlsx" aria-label="Impor data siswa" onChange={(event) => void importStudents(event)} type="file" />
      </label>
      <button className="admin-secondary-button" onClick={() => void exportStudents()} type="button">Ekspor</button>
    </div>
  ) : undefined;
  const page = currentRoute === "students"
    ? <StudentDataPage {...commonProps} classOptions={classOptions} fileActions={fileActions} onClassChange={setSelectedClass} selectedClass={selectedClass} />
    : currentRoute === "teachers"
      ? <TeacherDataPage {...commonProps} />
      : currentRoute === "classes"
        ? <ClassDataPage {...commonProps} />
        : currentRoute === "subjects"
          ? <SubjectDataPage {...commonProps} />
          : <TeacherAssignmentsPage {...commonProps} />;

  return (
    <>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {page}
      {dialogMode && (
        <div className="admin-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm();
        }}>
          <section aria-labelledby="admin-dialog-title" aria-modal="true" className="admin-dialog" role="dialog">
            <header className="admin-dialog-heading">
              <div>
                <span className="admin-eyebrow">{section.title}</span>
                <h2 id="admin-dialog-title">
                  {dialogMode === "details" ? "Detail data" : dialogMode === "edit" ? "Edit data" : section.addLabel}
                </h2>
              </div>
              <button aria-label="Tutup dialog" onClick={closeForm} type="button">×</button>
            </header>
            {dialogMode === "details" ? (
              <dl className="admin-detail-list">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>{selectedRecord?.[field.key] || "—"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <form className="admin-form" onSubmit={saveRecord}>
                {section.fields.map((field) => (
                  <label key={field.key}>
                    {field.label}
                    {field.type === "select" ? (
                      <select defaultValue={selectedRecord?.[field.key] ?? ""} name={field.key} required>
                        <option disabled value="">Pilih {field.label.toLocaleLowerCase("id")}</option>
                        {(field.options ?? getOptions(field.key)).map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        defaultValue={selectedRecord?.[field.key] ?? ""}
                        name={field.key}
                        required
                        type={field.type ?? "text"}
                      />
                    )}
                  </label>
                ))}
                {formError && <p className="admin-form-error" role="alert">{formError}</p>}
                <div className="admin-dialog-actions">
                  <button className="admin-secondary-button" onClick={closeForm} type="button">Batal</button>
                  <button className="admin-primary-button" type="submit">Simpan</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default AdminPanel;
