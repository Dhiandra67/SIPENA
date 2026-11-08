import { FormEvent, useMemo, useState } from "react";

interface Student {
  nis: string;
  name: string;
  className: string;
}

type DialogMode = "add" | "edit" | "details";

const initialStudents: Student[] = [
  { nis: "001", name: "Andi Pratama", className: "VII-A" },
  { nis: "002", name: "Budi Santoso", className: "VII-A" },
  { nis: "003", name: "Citra Lestari", className: "VII-B" },
  { nis: "004", name: "Dina Putri", className: "VIII-A" },
  { nis: "005", name: "Eka Saputra", className: "VII-B" },
  { nis: "006", name: "Fitri Handayani", className: "VIII-A" },
  { nis: "007", name: "Galih Ramadhan", className: "VII-A" },
  { nis: "008", name: "Hana Permata", className: "VIII-B" },
  { nis: "009", name: "Indra Wijaya", className: "VII-B" },
  { nis: "010", name: "Jihan Maharani", className: "VIII-B" },
  { nis: "011", name: "Kurniawan Putra", className: "VII-A" },
  { nis: "012", name: "Laras Wulandari", className: "VIII-A" },
];

const pageSize = 4;

function StudentData() {
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Semua Kelas");
  const [currentPage, setCurrentPage] = useState(1);
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formError, setFormError] = useState("");

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id");
    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.name.toLocaleLowerCase("id").includes(query) ||
        student.nis.toLocaleLowerCase("id").includes(query);
      const matchesClass =
        selectedClass === "Semua Kelas" || student.className === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [search, selectedClass, students]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const visibleStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function openDialog(mode: DialogMode, student: Student | null = null) {
    setSelectedStudent(student);
    setDialogMode(mode);
    setFormError("");
    setOpenActions(null);
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedStudent(null);
    setFormError("");
  }

  function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const student: Student = {
      nis: String(formData.get("nis") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      className: String(formData.get("className") ?? ""),
    };

    if (!student.nis || !student.name || !student.className) {
      setFormError("Lengkapi semua data siswa.");
      return;
    }

    const duplicateNis = students.some(
      (item) => item.nis === student.nis && item.nis !== selectedStudent?.nis,
    );
    if (duplicateNis) {
      setFormError("NIS tersebut sudah terdaftar.");
      return;
    }

    const isEditing = dialogMode === "edit" && selectedStudent !== null;
    if (isEditing && selectedStudent) {
      setStudents((current) =>
        current.map((item) => item.nis === selectedStudent.nis ? student : item),
      );
    } else {
      setStudents((current) => [...current, student]);
    }

    setSearch("");
    setSelectedClass("Semua Kelas");
    setCurrentPage(isEditing ? 1 : Math.ceil((students.length + 1) / pageSize));
    closeDialog();
  }

  function deleteStudent(student: Student) {
    if (!window.confirm(`Hapus data siswa ${student.name}?`)) {
      setOpenActions(null);
      return;
    }

    const remaining = students.filter((item) => item.nis !== student.nis);
    setStudents(remaining);
    setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(remaining.length / pageSize))));
    setOpenActions(null);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function updateClass(value: string) {
    setSelectedClass(value);
    setCurrentPage(1);
  }

  return (
    <>
      <section className="dashboard-heading student-heading">
        <h1>Data Siswa</h1>
        <p>Kelola informasi akademik dengan mudah</p>
      </section>

      <section className="student-page" aria-label="Data siswa">
        <div className="student-toolbar">
          <label className="student-search">
            <span className="visually-hidden">Cari nama atau NIS</span>
            <input
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Cari nama atau NIS..."
              type="search"
              value={search}
            />
          </label>
          <button className="student-add-button" onClick={() => openDialog("add")} type="button">
            + Tambah
          </button>
        </div>

        <div className="student-filter-row">
          <label className="student-class-filter">
            <span className="visually-hidden">Filter kelas</span>
            <select onChange={(event) => updateClass(event.target.value)} value={selectedClass}>
              <option>Semua Kelas</option>
              <option>VII-A</option>
              <option>VII-B</option>
              <option>VIII-A</option>
              <option>VIII-B</option>
            </select>
          </label>
        </div>

        <div className="student-table-wrap">
          <table className="student-table">
            <thead>
              <tr>
                <th scope="col">NIS</th>
                <th scope="col">Nama Siswa</th>
                <th scope="col">Kelas</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr key={student.nis}>
                  <td>{student.nis}</td>
                  <td>{student.name}</td>
                  <td>{student.className}</td>
                  <td className="student-action-cell">
                    <button
                      aria-expanded={openActions === student.nis}
                      aria-label={`Aksi untuk ${student.name}`}
                      className="student-actions-toggle"
                      onClick={() => setOpenActions((open) => open === student.nis ? null : student.nis)}
                      type="button"
                    >
                      ···
                    </button>
                    {openActions === student.nis && (
                      <div className="student-actions-menu">
                        <button onClick={() => openDialog("details", student)} type="button">Lihat detail</button>
                        <button onClick={() => openDialog("edit", student)} type="button">Edit data</button>
                        <button onClick={() => deleteStudent(student)} type="button">Hapus</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {visibleStudents.length === 0 && (
                <tr>
                  <td className="student-empty-state" colSpan={4}>Data siswa tidak ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="student-table-footer">
          <span>
            {students.length === initialStudents.length &&
            !search.trim() &&
            selectedClass === "Semua Kelas"
              ? "Menampilkan data contoh"
              : `Menampilkan ${filteredStudents.length} dari ${students.length} siswa`}
          </span>
          <nav className="student-pagination" aria-label="Navigasi halaman data siswa">
            <button
              aria-label="Halaman sebelumnya"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              ‹
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button
                aria-current={currentPage === page ? "page" : undefined}
                aria-label={`Halaman ${page}`}
                className={currentPage === page ? "current" : ""}
                key={page}
                onClick={() => setCurrentPage(page)}
                type="button"
              >
                {page}
              </button>
            ))}
            <button
              aria-label="Halaman berikutnya"
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              type="button"
            >
              ›
            </button>
          </nav>
        </footer>
      </section>

      {dialogMode && (
        <div className="student-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}>
          <section
            aria-labelledby="student-dialog-title"
            aria-modal="true"
            className="student-dialog"
            role="dialog"
          >
            <div className="student-dialog-heading">
              <h2 id="student-dialog-title">
                {dialogMode === "add" ? "Tambah Siswa" : dialogMode === "edit" ? "Edit Data Siswa" : "Detail Siswa"}
              </h2>
              <button aria-label="Tutup" onClick={closeDialog} type="button">×</button>
            </div>
            {dialogMode === "details" && selectedStudent ? (
              <dl className="student-detail-list">
                <div><dt>NIS</dt><dd>{selectedStudent.nis}</dd></div>
                <div><dt>Nama Siswa</dt><dd>{selectedStudent.name}</dd></div>
                <div><dt>Kelas</dt><dd>{selectedStudent.className}</dd></div>
              </dl>
            ) : (
              <form className="student-form" onSubmit={saveStudent}>
                <label>
                  NIS
                  <input defaultValue={selectedStudent?.nis ?? ""} name="nis" required />
                </label>
                <label>
                  Nama Siswa
                  <input defaultValue={selectedStudent?.name ?? ""} name="name" required />
                </label>
                <label>
                  Kelas
                  <select defaultValue={selectedStudent?.className ?? "VII-A"} name="className">
                    <option>VII-A</option>
                    <option>VII-B</option>
                    <option>VIII-A</option>
                    <option>VIII-B</option>
                  </select>
                </label>
                {formError && <p className="student-form-error" role="alert">{formError}</p>}
                <div className="student-dialog-actions">
                  <button className="student-cancel-button" onClick={closeDialog} type="button">Batal</button>
                  <button className="student-add-button" type="submit">Simpan</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default StudentData;
