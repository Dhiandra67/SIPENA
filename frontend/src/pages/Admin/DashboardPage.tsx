import type { FormEvent } from "react";
import type { AdminRecord } from "./types";

interface DashboardPageProps {
  currentPeriod: string;
  isLoading: boolean;
  periodOptions: string[];
  classes: AdminRecord[];
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  notice: string;
  onPeriodChange: (period: string) => void;
  onCreatePeriod: (year: string, semester: string) => void;
  onViewGrades: (classRecord: AdminRecord) => void;
}

function DashboardPage({
  currentPeriod,
  isLoading,
  periodOptions,
  classes,
  totalStudents,
  totalTeachers,
  totalClasses,
  totalSubjects,
  notice,
  onPeriodChange,
  onCreatePeriod,
  onViewGrades,
}: DashboardPageProps) {
  function submitPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onCreatePeriod(
      String(formData.get("academicYear") ?? "").trim(),
      String(formData.get("semester") ?? ""),
    );
  }

  return (
    <div className="admin-panel">
      <section className="admin-page-heading admin-dashboard-heading">
        <div>
          <span className="admin-eyebrow">SIPENA · ADMIN</span>
          <h1>Dashboard Admin</h1>
          <p>Kelola informasi akademik dan pantau data sekolah.</p>
        </div>
        <span className="admin-active-period">{isLoading ? "Memuat..." : currentPeriod}</span>
      </section>

      <section className="admin-stat-grid" aria-label="Ringkasan data sekolah">
        <article className="admin-stat-card">
          <span>Total Siswa</span><strong>{isLoading ? "..." : totalStudents}</strong><small>Siswa terdaftar</small>
        </article>
        <article className="admin-stat-card">
          <span>Total Guru</span><strong>{isLoading ? "..." : totalTeachers}</strong><small>Guru terdaftar</small>
        </article>
        <article className="admin-stat-card">
          <span>Total Kelas</span><strong>{isLoading ? "..." : totalClasses}</strong><small>Kelas terdaftar</small>
        </article>
        <article className="admin-stat-card">
          <span>Mata Pelajaran</span><strong>{isLoading ? "..." : totalSubjects}</strong><small>Mata pelajaran terdaftar</small>
        </article>
      </section>

      {notice && <p className="admin-notice" role="status">{notice}</p>}

      <section
        className="admin-records-card admin-period-card"
        aria-label="Periode akademik aktif"
      >
        <div className="admin-section-heading admin-card-heading">
          <div>
            <h2>Periode Akademik</h2>
            <p>Pilih periode yang digunakan untuk melihat kelas atau tambahkan periode baru.</p>
          </div>
        </div>
        <form className="admin-table-scroll" onSubmit={submitPeriod}>
          <table className="admin-table admin-period-table">
            <thead>
              <tr>
                <th scope="col">Pilih Periode Aktif</th>
                <th scope="col">Input Tahun Ajaran</th>
                <th scope="col">Semester</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Pilih Periode Aktif">
                  <label>
                    <span className="visually-hidden">Pilih periode aktif</span>
                    <select onChange={(event) => onPeriodChange(event.target.value)} value={currentPeriod}>
                      {periodOptions.map((period) => <option key={period}>{period}</option>)}
                    </select>
                  </label>
                </td>
                <td data-label="Input Tahun Ajaran">
                  <label>
                    <span className="visually-hidden">Tahun ajaran baru</span>
                    <input
                      name="academicYear"
                      pattern="[0-9]{4}/[0-9]{4}"
                      placeholder="Contoh: 2026/2027"
                      title="Gunakan format tahun/tahun, misalnya 2026/2027."
                      type="text"
                    />
                  </label>
                </td>
                <td data-label="Semester">
                  <label>
                    <span className="visually-hidden">Semester periode baru</span>
                    <select defaultValue="Ganjil" name="semester">
                      <option>Ganjil</option>
                      <option>Genap</option>
                    </select>
                  </label>
                </td>
                <td data-label="Aksi">
                  <button className="admin-primary-button" type="submit">Tambah &amp; Aktifkan</button>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </section>

      <section className="admin-records-card" aria-label={`Data kelas periode ${currentPeriod}`}>
        <div className="admin-section-heading admin-card-heading">
          <div>
            <h2>Data Kelas</h2>
            <p>Daftar kelas yang terdaftar pada periode {currentPeriod}.</p>
          </div>
        </div>
        <div className="admin-table-scroll admin-class-scroll">
          <table className="admin-table admin-dashboard-class-table">
            <thead>
              <tr>
                <th scope="col">Kode Kelas</th>
                <th scope="col">Nama Kelas</th>
                <th scope="col">Tingkat</th>
                <th scope="col">Wali Kelas</th>
                <th scope="col">Jumlah Siswa</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classRecord) => (
                <tr key={classRecord.id}>
                  <td data-label="Kode Kelas">{classRecord.code}</td>
                  <td data-label="Nama Kelas">{classRecord.name}</td>
                  <td data-label="Tingkat">{classRecord.level}</td>
                  <td data-label="Wali Kelas">{classRecord.homeroom || "—"}</td>
                  <td data-label="Jumlah Siswa">{classRecord.students}</td>
                  <td data-label="Aksi">
                    <button
                      className="admin-row-action-button"
                      onClick={() => onViewGrades(classRecord)}
                      type="button"
                    >
                      Lihat Nilai
                    </button>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td className="admin-empty" colSpan={6}>
                    {isLoading ? "Memuat data dari database..." : "Belum ada kelas pada periode ini."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="admin-records-footer">
          <span>{isLoading ? "Memuat data..." : `${classes.length} kelas pada periode aktif`}</span>
        </footer>
      </section>

    </div>
  );
}

export default DashboardPage;
