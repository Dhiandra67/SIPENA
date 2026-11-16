import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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
const sectionConfig: Record<AdminRoute, AdminSection> = {
  students: studentSection,
  teachers: teacherSection,
  classes: classSection,
  subjects: subjectSection,
  assignments: assignmentSection,
};

const initialRecords: RecordSet = {
  subjects: [
    { id: "m1", code: "MAT", name: "Matematika", group: "Umum", status: "Aktif" },
    { id: "m2", code: "BIN", name: "Bahasa Indonesia", group: "Umum", status: "Aktif" },
    { id: "m3", code: "IPA", name: "Ilmu Pengetahuan Alam", group: "Umum", status: "Aktif" },
    { id: "m4", code: "IPS", name: "Ilmu Pengetahuan Sosial", group: "Umum", status: "Aktif" },
    { id: "m5", code: "SBD", name: "Seni Budaya", group: "Muatan Lokal", status: "Aktif" },
  ],
  classes: [
    { id: "k1", code: "VII-A", name: "VII-A", level: "VII", homeroom: "Sari Wulandari, S.Pd.", period: activePeriod, students: "30" },
    { id: "k2", code: "VII-B", name: "VII-B", level: "VII", homeroom: "Dedi Saputra, S.Pd.", period: activePeriod, students: "29" },
    { id: "k3", code: "VIII-A", name: "VIII-A", level: "VIII", homeroom: "Ratna Dewi, S.Pd.", period: activePeriod, students: "31" },
    { id: "k4", code: "VIII-B", name: "VIII-B", level: "VIII", homeroom: "Sari Wulandari, S.Pd.", period: activePeriod, students: "30" },
  ],
  teachers: [
    { id: "t1", nip: "198501012010011001", name: "Sari Wulandari, S.Pd.", gender: "P", email: "sari@sekolah.sch.id", status: "Aktif" },
    { id: "t2", nip: "198702152012021002", name: "Dedi Saputra, S.Pd.", gender: "L", email: "dedi@sekolah.sch.id", status: "Aktif" },
    { id: "t3", nip: "199003102015031003", name: "Ratna Dewi, S.Pd.", gender: "P", email: "ratna@sekolah.sch.id", status: "Aktif" },
  ],
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
  assignments: [
    { id: "a1", teacher: "Sari Wulandari, S.Pd.", subject: "Matematika", className: "VII-A", period: activePeriod },
    { id: "a2", teacher: "Dedi Saputra, S.Pd.", subject: "Bahasa Indonesia", className: "VII-B", period: activePeriod },
    { id: "a3", teacher: "Ratna Dewi, S.Pd.", subject: "Ilmu Pengetahuan Alam", className: "VIII-A", period: activePeriod },
  ],
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (character === "," || character === ";")) {
      row.push(value.trim());
      value = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

interface AdminPanelProps {
  route: string;
  onNavigate: (route: string) => void;
}

function AdminPanel({ route, onNavigate }: AdminPanelProps) {
  const [records, setRecords] = useState<RecordSet>(initialRecords);
  const [periodOptions, setPeriodOptions] = useState(() =>
    Array.from(new Set([activePeriod, ...initialRecords.classes.map((record) => record.period)])),
  );
  const [currentPeriod, setCurrentPeriod] = useState(activePeriod);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Semua Kelas");
  const [selectedGradeClass, setSelectedGradeClass] = useState<AdminRecord | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "details" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState<{ message: string; route: string } | null>(null);

  useEffect(() => {
    setNotice(null);
  }, [route]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  function showNotice(message: string) {
    setNotice({ message, route });
  }

  const currentRoute: AdminRoute | null = Object.prototype.hasOwnProperty.call(sectionConfig, route)
    ? (route as AdminRoute)
    : null;
  const section = currentRoute ? sectionConfig[currentRoute] : null;
  const rows = currentRoute ? records[currentRoute] : [];
  const visibleRows = useMemo(() => {
    if (!section) return [];
    const query = search.trim().toLocaleLowerCase("id");
    return rows.filter((record) =>
      (!query || section.searchKeys.some((key) => record[key]?.toLocaleLowerCase("id").includes(query))) &&
      (currentRoute !== "students" || selectedClass === "Semua Kelas" || record.className === selectedClass),
    );
  }, [currentRoute, rows, search, section, selectedClass]);

  function navigate(nextRoute: string) {
    setSearch("");
    setSelectedClass("Semua Kelas");
    setNotice(null);
    onNavigate(nextRoute);
  }

  function choosePeriod(period: string) {
    setCurrentPeriod(period);
    setNotice(null);
  }

  function createPeriod(year: string, semester: string) {
    if (!/^\d{4}\/\d{4}$/.test(year)) {
      showNotice("Masukkan tahun ajaran dengan format YYYY/YYYY, misalnya 2026/2027.");
      return;
    }

    const period = `${year} · ${semester}`;
    setPeriodOptions((current) => current.includes(period) ? current : [...current, period]);
    setCurrentPeriod(period);
    showNotice(`Periode ${period} sekarang menjadi periode aktif.`);
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

  function validateRecord(candidate: AdminRecord): string {
    if (!currentRoute) return "Halaman tidak ditemukan.";
    const existing = records[currentRoute].filter((record) => record.id !== selectedRecord?.id);

    if (currentRoute === "subjects") {
      if (existing.some((record) =>
        record.code.toLocaleLowerCase("id") === candidate.code.toLocaleLowerCase("id") ||
        record.name.toLocaleLowerCase("id") === candidate.name.toLocaleLowerCase("id")
      )) {
        return "Kode atau nama mata pelajaran sudah terdaftar.";
      }
    }

    if (currentRoute === "teachers") {
      if (existing.some((record) =>
        record.nip === candidate.nip ||
        record.email.toLocaleLowerCase("id") === candidate.email.toLocaleLowerCase("id")
      )) {
        return "NIP atau email guru sudah terdaftar.";
      }
    }

    if (currentRoute === "students") {
      if (existing.some((record) => record.nis === candidate.nis || record.nisn === candidate.nisn)) {
        return "NIS atau NISN sudah terdaftar.";
      }
      if (!records.classes.some((record) => record.code === candidate.className && record.period === currentPeriod)) {
        return "Pilih kelas yang terdaftar pada periode aktif.";
      }
    }

    if (currentRoute === "classes") {
      if (existing.some((record) =>
        record.code.toLocaleLowerCase("id") === candidate.code.toLocaleLowerCase("id") &&
        record.period === candidate.period
      )) {
        return "Kode kelas sudah terdaftar pada periode tersebut.";
      }
    }

    if (currentRoute === "assignments") {
      if (!records.teachers.some((record) => record.name === candidate.teacher)) {
        return "Pilih guru yang terdaftar.";
      }
      if (!records.subjects.some((record) => record.name === candidate.subject)) {
        return "Pilih mata pelajaran yang terdaftar.";
      }
      if (!records.classes.some((record) => record.name === candidate.className && record.period === candidate.period)) {
        return "Pilih kelas yang terdaftar pada periode penugasan.";
      }
      if (existing.some((record) =>
        record.teacher === candidate.teacher &&
        record.subject === candidate.subject &&
        record.className === candidate.className &&
        record.period === candidate.period,
      )) {
        return "Penugasan guru, mata pelajaran, kelas, dan periode tersebut sudah ada.";
      }
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
    const validationMessage = validateRecord(candidate);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const id = selectedRecord?.id ?? createId();
    setRecords((current) => {
      const existing = current[currentRoute];
      let updated = dialogMode === "edit"
        ? existing.map((record) => record.id === id ? { ...candidate, id } : record)
        : [...existing, { ...candidate, id }];
      let nextRecords = { ...current, [currentRoute]: updated };

      if (dialogMode === "edit" && selectedRecord) {
        if (currentRoute === "classes" && selectedRecord.name !== candidate.name) {
          nextRecords = {
            ...nextRecords,
            students: current.students.map((record) => record.className === selectedRecord.code ? { ...record, className: candidate.code } : record),
            assignments: current.assignments.map((record) => record.className === selectedRecord.name ? { ...record, className: candidate.name } : record),
          };
        } else if (currentRoute === "teachers" && selectedRecord.name !== candidate.name) {
          nextRecords = {
            ...nextRecords,
            classes: current.classes.map((record) => record.homeroom === selectedRecord.name ? { ...record, homeroom: candidate.name } : record),
            assignments: current.assignments.map((record) => record.teacher === selectedRecord.name ? { ...record, teacher: candidate.name } : record),
          };
        } else if (currentRoute === "subjects" && selectedRecord.name !== candidate.name) {
          nextRecords = {
            ...nextRecords,
            assignments: current.assignments.map((record) => record.subject === selectedRecord.name ? { ...record, subject: candidate.name } : record),
          };
        }
      }
      return nextRecords;
    });
    showNotice(dialogMode === "edit" ? "Perubahan berhasil disimpan." : "Data berhasil ditambahkan.");
    closeForm();
  }

  function deleteRecord(record: AdminRecord) {
    if (!currentRoute) return;
    const hasReferences =
      (currentRoute === "classes" &&
        (records.students.some((item) => item.className === record.code) ||
          records.assignments.some((item) => item.className === record.name))) ||
      (currentRoute === "teachers" &&
        (records.classes.some((item) => item.homeroom === record.name) ||
          records.assignments.some((item) => item.teacher === record.name))) ||
      (currentRoute === "subjects" && records.assignments.some((item) => item.subject === record.name));
    if (hasReferences) {
      showNotice("Data masih digunakan oleh data akademik lain. Hapus atau pindahkan relasinya terlebih dahulu.");
      return;
    }
    if (!window.confirm(`Hapus data "${record.name ?? record.grade ?? record.code ?? record.nis ?? record.teacher ?? ""}"?`)) {
      return;
    }
    setRecords((current) => ({
      ...current,
      [currentRoute]: current[currentRoute].filter((item) => item.id !== record.id),
    }));
    showNotice("Data berhasil dihapus.");
  }

  async function exportStudents() {
    const headers = ["No", "NIS", "NISN", "Nama Lengkap", "Jenis Kelamin (L/P)", "Kode Kelas"];
    const dataRows = visibleRows.map((record, index) => [
      String(index + 1), record.nis, record.nisn, record.name, record.gender,
      record.className,
    ]);
    try {
      await downloadSpreadsheet("data-siswa-sipena.xlsx", [headers, ...dataRows], "Data Siswa");
      showNotice("File Excel data siswa berhasil diunduh.");
    } catch (error) {
      console.error("Failed to export students.", error);
      showNotice("Data siswa tidak dapat diekspor. Silakan coba lagi.");
    }
  }

  async function downloadStudentTemplate() {
    try {
      await downloadSpreadsheet("template-impor-siswa.xlsx", [[
        "No", "NIS*", "NISN*", "Nama Lengkap*", "Jenis Kelamin (L/P)*", "Kode Kelas*",
      ]], "Data Siswa");
      showNotice("Template impor siswa berhasil diunduh.");
    } catch (error) {
      console.error("Failed to export student template.", error);
      showNotice("Template tidak dapat diunduh. Silakan coba lagi.");
    }
  }

  async function importStudents(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showNotice("Ukuran file melebihi batas 5 MB.");
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      showNotice("Format file tidak didukung. Pilih file .xlsx atau .csv.");
      return;
    }

    try {
      let parsedRows: string[][];
      if (file.name.toLowerCase().endsWith(".csv")) {
        parsedRows = parseCsv(await file.text());
      } else {
        const XLSX = (await import("@e965/xlsx/dist/xlsx.mini.min.js")).default;
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
          showNotice("File Excel tidak memiliki lembar kerja.");
          return;
        }
        parsedRows = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
          header: 1,
          defval: "",
          raw: false,
        });
      }
      if (parsedRows.length < 2) {
        showNotice("File tidak berisi data siswa.");
        return;
      }
      const headers = parsedRows[0].map((header) =>
        header.replace(/^\uFEFF/, "").replace(/\*/g, "").trim().toLocaleLowerCase("id"),
      );
      const findColumn = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const columns = {
        nis: findColumn("nis"),
        nisn: findColumn("nisn"),
        name: findColumn("nama lengkap", "nama", "name"),
        gender: findColumn("jenis kelamin (l/p)", "jenis kelamin", "gender"),
        className: findColumn("kode kelas", "kelas"),
      };
      if ([columns.nis, columns.nisn, columns.name, columns.gender, columns.className].some((column) => column < 0)) {
        showNotice("Header CSV tidak sesuai template impor siswa.");
        return;
      }

      const imported: AdminRecord[] = [];
      const errors: string[] = [];
      const usedNis = new Set(records.students.map((record) => record.nis));
      const usedNisn = new Set(records.students.map((record) => record.nisn));
      for (const [index, row] of parsedRows.slice(1).entries()) {
        const getValue = (column: number) => column < 0 ? "" : (row[column] ?? "").trim();
        const student: AdminRecord = {
          id: createId(),
          nis: getValue(columns.nis),
          nisn: getValue(columns.nisn),
          name: getValue(columns.name),
          gender: getValue(columns.gender).toUpperCase(),
          className: getValue(columns.className),
          status: "Aktif",
        };
        if (!student.nis || !student.nisn || !student.name || !student.className) {
          errors.push(`Baris ${index + 2}: NIS, NISN, nama, dan kode kelas wajib diisi.`);
        } else if (student.gender !== "L" && student.gender !== "P") {
          errors.push(`Baris ${index + 2}: jenis kelamin hanya boleh L atau P.`);
        } else if (!records.classes.some((record) =>
          record.code.toLocaleLowerCase("id") === student.className.toLocaleLowerCase("id") &&
          record.period === currentPeriod
        )) {
          errors.push(`Baris ${index + 2}: kode kelas tidak ditemukan pada periode aktif.`);
        } else if (usedNis.has(student.nis) || usedNisn.has(student.nisn)) {
          errors.push(`Baris ${index + 2}: NIS atau NISN sudah terdaftar/duplikat.`);
        } else {
          usedNis.add(student.nis);
          usedNisn.add(student.nisn);
          imported.push(student);
        }
      }

      if (errors.length) {
        showNotice(`Impor dibatalkan; tidak ada data disimpan. ${errors.slice(0, 3).join(" ")}`);
        return;
      }
      if (!imported.length) {
        showNotice("Tidak ada baris siswa yang dapat diimpor.");
        return;
      }
      setRecords((current) => ({ ...current, students: [...current.students, ...imported] }));
      showNotice(`${imported.length} data siswa berhasil diimpor.`);
    } catch (error) {
      console.error("Failed to import student spreadsheet.", error);
      showNotice("File tidak dapat dibaca. Periksa format Excel/CSV dan coba lagi.");
    }
  }

  if (route === "grades" && selectedGradeClass) {
    const gradeClasses = records.classes.filter((record) => record.period === currentPeriod);
    return (
      <ClassGradesPage
        classRecord={selectedGradeClass}
        classes={gradeClasses}
        onNavigate={navigate}
        onClassChange={(classId) => {
          const nextClass = gradeClasses.find((classRecord) => classRecord.id === classId);
          if (nextClass) setSelectedGradeClass(nextClass);
        }}
        period={currentPeriod}
        subjects={records.subjects.filter((subject) => subject.status === "Aktif")}
        students={records.students.filter((student) => student.className === selectedGradeClass.code)}
      />
    );
  }

  if (!section || !currentRoute) {
    const activeClasses = records.classes.filter((record) => record.period === currentPeriod);
    const dashboardClasses = activeClasses.map((classRecord) => ({
      ...classRecord,
      students: String(records.students.filter((student) =>
        student.className === classRecord.code && student.status === "Aktif",
      ).length),
    }));
    return (
      <DashboardPage
        classes={dashboardClasses}
        currentPeriod={currentPeriod}
        onCreatePeriod={createPeriod}
        onPeriodChange={choosePeriod}
        onViewGrades={(classRecord) => {
          setSelectedGradeClass(classRecord);
          navigate("grades");
        }}
        periodOptions={periodOptions}
        notice={notice?.route === route ? notice.message : ""}
        totalClasses={records.classes.length}
        totalStudents={records.students.length}
        totalTeachers={records.teachers.length}
        totalSubjects={records.subjects.length}
      />
    );
  }

  const fileActions = (
    <div className="admin-file-actions">
      <button className="admin-secondary-button" onClick={() => void downloadStudentTemplate()} type="button">Template XLSX</button>
      <label className="admin-secondary-button admin-file-button">
        Impor XLSX/CSV
        <input accept=".csv,.xlsx" onChange={(event) => void importStudents(event)} type="file" />
      </label>
      <button className="admin-secondary-button" onClick={() => void exportStudents()} type="button">Ekspor XLSX</button>
    </div>
  );
  const pageProps = {
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
  const page = currentRoute === "students" ? (
    <StudentDataPage
      {...pageProps}
      classOptions={records.classes.map((record) => record.code)}
      fileActions={fileActions}
      footerNote="Format .xlsx / .csv · Maksimal 5 MB"
      onClassChange={setSelectedClass}
      selectedClass={selectedClass}
    />
  ) : currentRoute === "teachers" ? (
    <TeacherDataPage {...pageProps} />
  ) : currentRoute === "classes" ? (
    <ClassDataPage
      {...pageProps}
      renderCell={(record, key) => key === "students"
        ? records.students.filter((student) => student.className === record.code && student.status === "Aktif").length
        : undefined}
    />
  ) : currentRoute === "subjects" ? (
    <SubjectDataPage {...pageProps} />
  ) : (
    <TeacherAssignmentsPage {...pageProps} />
  );

  return (
    <>
      {notice?.route === route && <p className="admin-notice" role="status">{notice.message}</p>}
      {page}

      {dialogMode && (
        <div className="admin-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm();
        }}>
          <section aria-labelledby="admin-dialog-title" aria-modal="true" className="admin-dialog" role="dialog">
            <div className="admin-dialog-heading">
              <div>
                <span className="admin-eyebrow">{section.title}</span>
                <h2 id="admin-dialog-title">
                  {dialogMode === "create" ? section.addLabel : dialogMode === "edit" ? `Edit ${section.title.toLocaleLowerCase("id")}` : `Detail ${section.title.toLocaleLowerCase("id")}`}
                </h2>
              </div>
              <button aria-label="Tutup" onClick={closeForm} type="button">×</button>
            </div>
            {dialogMode === "details" && selectedRecord ? (
              <dl className="admin-detail-list">
                {section.fields.map((field) => (
                  <div key={field.key}><dt>{field.label}</dt><dd>{selectedRecord[field.key] || "—"}</dd></div>
                ))}
              </dl>
            ) : (
              <form className="admin-form" onSubmit={saveRecord}>
                {section.fields.map((field) => {
                  const options = currentRoute === "classes" && field.key === "homeroom"
                    ? records.teachers.filter((record) => record.status === "Aktif").map((record) => record.name)
                    : currentRoute === "students" && field.key === "className"
                      ? records.classes.filter((record) => record.period === currentPeriod).map((record) => record.code)
                      : currentRoute === "assignments" && field.key === "teacher"
                        ? records.teachers.filter((record) => record.status === "Aktif").map((record) => record.name)
                        : currentRoute === "assignments" && field.key === "subject"
                          ? records.subjects.filter((record) => record.status === "Aktif").map((record) => record.name)
                          : currentRoute === "assignments" && field.key === "className"
                            ? records.classes.filter((record) => record.period === selectedRecord?.period || record.period === currentPeriod).map((record) => record.name)
                            : field.key === "period"
                              ? [currentPeriod]
                              : field.options;
                  const availableOptions = options
                    ? Array.from(new Set([...options, ...(selectedRecord?.[field.key] ? [selectedRecord[field.key]] : [])]))
                    : [];
                  return (
                    <label key={field.key}>
                      {field.label}
                      {field.type === "select" ? (
                        <select
                          defaultValue={selectedRecord?.[field.key] ?? (field.key === "period" ? currentPeriod : options?.[0])}
                          name={field.key}
                          required={field.required !== false}
                        >
                          {availableOptions.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input
                          defaultValue={selectedRecord?.[field.key] ?? ""}
                          max={field.max}
                          min={field.min}
                          name={field.key}
                          required={field.required !== false}
                          step={field.step}
                          type={field.type ?? "text"}
                        />
                      )}
                    </label>
                  );
                })}
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
