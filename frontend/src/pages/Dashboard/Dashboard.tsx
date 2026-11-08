import { useEffect, useState } from "react";
import type { AuthUser } from "../Login/auth";
import StudentData from "./StudentData";
import "./Dashboard.css";

type IconName =
  | "brand"
  | "dashboard"
  | "students"
  | "teacher"
  | "classes"
  | "subjects"
  | "tasks"
  | "calendar"
  | "settings"
  | "logout"
  | "menu"
  | "grades";

interface DashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

function Icon({ name }: { name: IconName }) {
  if (name === "brand") {
    return <span className="dashboard-brand-mark" aria-hidden="true">R</span>;
  }

  const paths: Record<Exclude<IconName, "brand">, React.ReactNode> = {
    dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    students: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19v-1.5a5.5 5.5 0 0 1 11 0V19Zm12-9a2.5 2.5 0 1 0 0-5m1.5 8a4.5 4.5 0 0 1 3.5 4.4V19h-3" /></>,
    teacher: <><path d="M12 3 4 7v5c0 4.4 3.4 7.7 8 9 4.6-1.3 8-4.6 8-9V7l-8-4Z" /><path d="M9 10h6m-3-3v6" /></>,
    classes: <><path d="M4 5.5h16v13H4zM8 9h8m-8 4h8m-8 3h5" /></>,
    subjects: <><path d="M5 4.5h14v15H5zM8 8h8m-8 4h8m-8 4h5" /></>,
    tasks: <><path d="M8 5h12M8 12h12M8 19h12" /><path d="m3.5 5 .8.8L5.8 4m-2.3 8 .8.8 1.5-1.8m-2.3 8 .8.8 1.5-1.8" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.8 7.8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a7.8 7.8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7.3 7.3 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a7.8 7.8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a7.8 7.8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7.3 7.3 0 0 1 0 2Z" /></>,
    logout: <><path d="M10 5H5v14h5m5-4 4-3-4-3m4 3H9" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    grades: <><path d="M4 4h16v16H4zM8 16l2.5-3 2 2 3.5-5" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className="dashboard-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

const adminNavigation: { label: string; icon: IconName; href: string }[] = [
  { label: "Dashboard", icon: "dashboard", href: "#dashboard" },
  { label: "Data Siswa", icon: "students", href: "#students" },
  { label: "Data Guru", icon: "teacher", href: "#teachers" },
  { label: "Data Kelas", icon: "classes", href: "#classes" },
  { label: "Mata Pelajaran", icon: "subjects", href: "#subjects" },
  { label: "Pembagian Tugas Guru", icon: "tasks", href: "#assignments" },
  { label: "Tahun Ajaran", icon: "calendar", href: "#academic" },
  { label: "Konfigurasi Nilai", icon: "settings", href: "#grades" },
];

const teacherNavigation: { label: string; icon: IconName; href: string }[] = [
  { label: "Dashboard", icon: "dashboard", href: "#dashboard" },
  { label: "Pengajaran Saya", icon: "subjects", href: "#assignments" },
  { label: "Pengaturan Komponen Nilai", icon: "settings", href: "#grade-settings" },
  { label: "Input dan Kelola Nilai", icon: "grades", href: "#grade-entry" },
  { label: "Kelas Perwalian", icon: "teacher", href: "#homeroom" },
  { label: "Data Siswa", icon: "students", href: "#students" },
  { label: "Rekap Nilai Kelas", icon: "tasks", href: "#grade-summary" },
  { label: "Laporan Rapor", icon: "classes", href: "#reports" },
  { label: "Profil Saya", icon: "teacher", href: "#profile" },
];

function Dashboard({ user, onLogout }: DashboardProps) {
  const isAdmin = user.role.toLowerCase().includes("admin");
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = user.name || (isAdmin ? "Admin" : "Ibu Sari");
  const navigation = isAdmin ? adminNavigation : teacherNavigation;
  const [activeRoute, setActiveRoute] = useState(
    () => window.location.hash.slice(1) || "students",
  );
  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  useEffect(() => {
    function syncRoute() {
      setActiveRoute(window.location.hash.slice(1) || "students");
    }

    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  const activePage = navigation.find((item) => item.href === `#${activeRoute}`);
  const pageTitle = activePage?.label ?? "Halaman";

  return (
    <div className={`dashboard-app ${isAdmin ? "admin-dashboard" : "teacher-dashboard"}`}>
      <aside className="dashboard-sidebar">
        <a className="dashboard-brand" href="#dashboard" aria-label="SIPENA dashboard">
          <Icon name="brand" />
          <span>
            <strong>SIPENA</strong>
            <small>{isAdmin ? "ADMIN PANEL" : "TEACHER PANEL"}</small>
          </span>
        </a>
        <nav className="sidebar-navigation" aria-label="Navigasi utama">
          {navigation.map((item) => (
            <a
              aria-current={item.href === `#${activeRoute}` ? "page" : undefined}
              className={item.href === `#${activeRoute}` ? "navigation-link active" : "navigation-link"}
              href={item.href}
              key={item.label}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={onLogout} type="button">
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <span>{isAdmin ? "Panel Administrasi" : "Guru Mata Pelajaran & Wali Kelas"}</span>
          <div className="topbar-user">
            <strong>{displayName}</strong>
            <span className="user-avatar">{initial}</span>
          </div>
        </header>

        <header className="mobile-dashboard-header">
          <a className="dashboard-brand mobile-brand" href="#dashboard" aria-label="SIPENA dashboard">
            <Icon name="brand" />
            <strong>SIPENA</strong>
          </a>
          <button
            aria-controls="mobile-dashboard-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <div
            aria-hidden={!menuOpen}
            className={`mobile-menu${menuOpen ? " open" : ""}`}
            id="mobile-dashboard-menu"
          >
            {navigation.map((item) => (
              <a
                aria-current={item.href === `#${activeRoute}` ? "page" : undefined}
                href={item.href}
                key={item.label}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
            <button onClick={onLogout} type="button">
              <Icon name="logout" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="dashboard-content" id="dashboard">
          {activeRoute === "students" ? (
            <StudentData />
          ) : activeRoute === "dashboard" ? (
            <>
              <section className="dashboard-heading">
                <h1>Dashboard{isAdmin ? " Admin" : ""}</h1>
                {isAdmin ? (
                  <p>Kelola informasi akademik dengan mudah</p>
                ) : (
                  <>
                    <p className="teacher-desktop-description">
                      Ringkasan pengajaran Matematika dan perwalian kelas VII-A
                    </p>
                    <p className="teacher-mobile-description">
                      Pengajaran dan perwalian dalam satu akun
                    </p>
                  </>
                )}
              </section>
              {isAdmin ? <AdminDashboard /> : <TeacherDashboard displayName={displayName} />}
            </>
          ) : (
            <NavigationPage title={pageTitle} />
          )}
        </main>

      </div>
    </div>
  );
}

function NavigationPage({ title }: { title: string }) {
  return (
    <section className="dashboard-heading navigation-page">
      <h1>{title}</h1>
      <p>Kelola informasi akademik dengan mudah</p>
      <div className="navigation-page-message">
        <strong>{title}</strong>
        <p>Halaman ini siap digunakan saat data {title.toLowerCase()} tersedia.</p>
        <a href="#dashboard">Kembali ke Dashboard</a>
      </div>
    </section>
  );
}

function AdminDashboard() {
  const statistics = [
    { title: "Total Siswa", value: "180", detail: "Data tahun ajaran aktif", id: "students" },
    { title: "Total Guru", value: "24", detail: "Data tahun ajaran aktif", id: "teachers" },
    { title: "Total Kelas", value: "6", detail: "Data tahun ajaran aktif", id: "classes" },
    { title: "Mata Pelajaran", value: "12", detail: "Data tahun ajaran aktif", id: "subjects" },
  ];

  return (
    <>
      <section className="statistics-grid" aria-label="Ringkasan statistik">
        {statistics.map((statistic) => (
          <article className="statistic-card" id={statistic.id} key={statistic.title}>
            <h2>{statistic.title}</h2>
            <strong>{statistic.value}</strong>
            <p>{statistic.detail}</p>
          </article>
        ))}
      </section>

      <section className="academic-card" id="academic">
        <div>
          <h2>Informasi Akademik</h2>
          <strong>Tahun Ajaran 2026/2027</strong>
          <p>Semester Ganjil</p>
        </div>
        <span className="status-badge">Aktif</span>
      </section>

      <section className="dashboard-section class-summary" id="classes-summary">
        <h2>Ringkasan Kelas</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Tingkat</th><th>Nama Kelas</th><th>Jumlah Kelas</th></tr>
            </thead>
            <tbody>
              <tr><td>VII</td><td>VII-A, VII-B</td><td>2</td></tr>
              <tr><td>VIII</td><td>VIII-A, VIII-B</td><td>2</td></tr>
              <tr><td>IX</td><td>IX-A, IX-B</td><td>2</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TeacherDashboard({ displayName }: { displayName: string }) {
  return (
    <>
      <section className="statistics-grid teacher-statistics" aria-label="Ringkasan statistik">
        <article className="statistic-card">
          <h2>Kelas Diampu</h2>
          <strong>3</strong>
        </article>
        <article className="statistic-card">
          <h2>Mata Pelajaran</h2>
          <strong>1</strong>
        </article>
        <article className="statistic-card teacher-extra-stat">
          <h2>Jumlah Siswa</h2>
          <strong>92</strong>
        </article>
        <article className="statistic-card teacher-extra-stat">
          <h2>Tahun Ajaran</h2>
          <strong>2026/27</strong>
        </article>
      </section>

      <section className="academic-card teacher-academic">
        <div>
          <h2>Informasi Akademik</h2>
          <p>Tahun Ajaran 2026/2027 <span className="desktop-separator">•</span><br className="mobile-only" /> Semester Ganjil</p>
        </div>
      </section>

      <section className="dashboard-section assignments-section" id="assignments">
        <h2>Penugasan Saya</h2>
        <div className="table-scroll assignment-table">
          <table>
            <thead>
              <tr><th>Mata Pelajaran</th><th>Kelas Diampu</th><th>Jumlah Siswa</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              <tr><td>Matematika</td><td>VII-A, VII-B, VIII-A</td><td>92</td><td><a href="#assignments">Lihat</a></td></tr>
            </tbody>
          </table>
        </div>
        <div className="assignment-cards">
          <article><strong>Matematika</strong><span>VII-A, VII-B, VIII-A</span></article>
        </div>
      </section>

      <section className="homeroom-card" id="homeroom">
        <div className="homeroom-heading">
          <h2><span className="homeroom-desktop-label">Kelas Perwalian · </span>VII-A</h2>
          <p>{displayName} · Wali Kelas <span className="desktop-separator">|</span> Semester Ganjil 2026/2027</p>
        </div>
        <div className="homeroom-statistics">
          <strong>30 siswa</strong>
          <strong>28 rapor siap</strong>
          <strong>11/12 mapel lengkap</strong>
        </div>
        <p className="homeroom-desktop-note">
          2 siswa menunggu nilai Matematika. Lengkapi UAS Eka dan UTS Fitri.
        </p>
        <p className="homeroom-mobile-note">
          Lengkapi UAS Eka dan UTS Fitri di Matematika untuk menyiapkan 2 rapor lainnya.
        </p>
        <div className="homeroom-actions">
          <a href="#homeroom">Kelas perwalian <span aria-hidden="true">→</span></a>
          <a href="#grade-summary">Rekap nilai &amp; rapor <span aria-hidden="true">→</span></a>
          <a className="homeroom-reports-link" href="#reports">Laporan rapor <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <p className="teacher-access-note">
        Akses Anda: edit Matematika di VII-A, VII-B, VIII-A · Lihat semua mapel dan buat rapor hanya VII-A.
      </p>
    </>
  );
}

export default Dashboard;
