import { FormEvent, useEffect, useRef, useState } from "react";
import { getStoredAccessToken, type AuthUser } from "../Login/auth";
import AdminPanel from "./AdminPanel";
import TeacherPanel from "./TeacherPanel";
import "./Dashboard.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

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
  { label: "Rentang Nilai", icon: "settings", href: "#grades" },
];

const teacherNavigation: { label: string; icon: IconName; href: string }[] = [
  { label: "Dashboard", icon: "dashboard", href: "#dashboard" },
  { label: "Pengajaran Saya", icon: "subjects", href: "#assignments" },
  { label: "Pengaturan Komponen Nilai", icon: "settings", href: "#grade-settings" },
  { label: "Input dan Kelola Nilai", icon: "grades", href: "#grade-entry" },
  { label: "Data Siswa", icon: "students", href: "#students" },
  { label: "Statistik", icon: "tasks", href: "#statistics" },
  { label: "Laporan Nilai Mapel", icon: "classes", href: "#reports" },
  { label: "Profil Saya", icon: "teacher", href: "#profile" },
];

function Dashboard({ user, onLogout }: DashboardProps) {
  const isAdmin = user.role.toLowerCase().includes("admin");
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.name || "Ibu Sari");
  const [profileEmail, setProfileEmail] = useState(user.email || "");
  const [profileNip, setProfileNip] = useState<string>("");
  const [profileStatus, setProfileStatus] = useState<string>("Aktif");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const navigation = isAdmin ? adminNavigation : teacherNavigation;
  const [activeRoute, setActiveRoute] = useState(
    () => window.location.hash.slice(1) || "dashboard",
  );
  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  useEffect(() => {
    function syncRoute() {
      setActiveRoute(window.location.hash.slice(1) || "dashboard");
    }

    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;

    void fetch(`${apiBaseUrl}/v1/profile`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: {
        data?: {
          name?: string;
          email?: string;
          nip?: string | null;
          status?: string;
        };
      } | null) => {
        if (payload?.data) {
          if (payload.data.name) setDisplayName(payload.data.name);
          if (payload.data.email) setProfileEmail(payload.data.email);
          if (payload.data.nip) setProfileNip(payload.data.nip);
          if (payload.data.status) setProfileStatus(payload.data.status);
        }
      })
      .catch(() => {
        // Ignore background profile refresh error
      });
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");
    setProfileNotice("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const nextEmail = String(formData.get("email") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (!name || !nextEmail) {
      setProfileError("Nama lengkap dan email wajib diisi.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setProfileError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmation) {
      setProfileError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    const token = getStoredAccessToken();
    if (!token) {
      setProfileError("Sesi autentikasi tidak ditemukan. Silakan login kembali.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email: nextEmail, newPassword, confirmation }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        data?: { name?: string; email?: string; nip?: string | null; status?: string };
      } | null;

      if (!response.ok) {
        setProfileError(payload?.message ?? "Gagal memperbarui profil akun.");
        return;
      }

      setDisplayName(payload?.data?.name ?? name);
      setProfileEmail(payload?.data?.email ?? nextEmail);
      if (payload?.data?.nip !== undefined) {
        setProfileNip(payload.data.nip ?? "");
      }
      setProfileNotice(payload?.message ?? "Profil akun berhasil diperbarui.");
    } catch {
      setProfileError("Tidak dapat terhubung ke server backend. Perubahan tidak disimpan.");
    } finally {
      setIsSavingProfile(false);
    }
  }

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
          <span>
            {isAdmin ? "Panel Administrasi" : "Guru Mata Pelajaran"}
          </span>
          <div className="topbar-user-container" ref={popoverRef}>
            <button
              aria-expanded={profileMenuOpen}
              aria-haspopup="dialog"
              className="topbar-user-button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              type="button"
            >
              <strong>{displayName}</strong>
              <span className="user-avatar">{initial}</span>
            </button>

            {profileMenuOpen && (
              <section
                aria-label="Informasi profil pengguna"
                className="profile-popover"
                role="dialog"
              >
                <div className="profile-popover-header">
                  <span className="profile-popover-avatar" aria-hidden="true">
                    {initial}
                  </span>
                  <div className="profile-popover-identity">
                    <strong>{displayName}</strong>
                    <small>{profileEmail}</small>
                  </div>
                </div>

                <dl className="profile-popover-details">
                  <div>
                    <dt>Nama Lengkap</dt>
                    <dd>{displayName}</dd>
                  </div>
                  <div>
                    <dt>Email Login</dt>
                    <dd>{profileEmail}</dd>
                  </div>
                  <div>
                    <dt>Peran Akun</dt>
                    <dd>{isAdmin ? "Admin Sekolah" : "Guru Mata Pelajaran"}</dd>
                  </div>
                  {!isAdmin && (
                    <div>
                      <dt>NIP</dt>
                      <dd>{profileNip || "—"}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Status Akun</dt>
                    <dd>
                      <span className="profile-status-badge">{profileStatus}</span>
                    </dd>
                  </div>
                </dl>

                <div className="profile-popover-actions">
                  <button
                    className="profile-popover-action primary"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setProfileError("");
                      setProfileNotice("");
                      setProfileModalOpen(true);
                    }}
                    type="button"
                  >
                    Edit Profil &amp; Ubah Sandi
                  </button>
                  <button
                    className="profile-popover-action danger"
                    onClick={onLogout}
                    type="button"
                  >
                    Keluar (Logout)
                  </button>
                </div>
              </section>
            )}
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

        {isAdmin && (
          <nav className="admin-bottom-nav" aria-label="Navigasi admin">
            {([
              ["dashboard", "Dashboard", "dashboard"],
              ["students", "Siswa", "students"],
              ["teachers", "Guru", "teacher"],
            ] as const).map(([route, label, icon]) => (
              <a
                aria-current={activeRoute === route ? "page" : undefined}
                href={`#${route}`}
                key={route}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </a>
            ))}
            <button
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <Icon name="menu" />
              <span>Semua Menu</span>
            </button>
          </nav>
        )}
        {!isAdmin && (
          <nav className="teacher-bottom-nav" aria-label="Navigasi guru">
            {([
              ["dashboard", "Dashboard", "dashboard"],
              ["assignments", "Pengajaran", "subjects"],
              ["grade-entry", "Input Nilai", "grades"],
            ] as const).map(([route, label, icon]) => (
              <a
                aria-current={activeRoute === route ? "page" : undefined}
                href={`#${route}`}
                key={route}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </a>
            ))}
            <button
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <Icon name="menu" />
              <span>Semua Menu</span>
            </button>
          </nav>
        )}

        <main className="dashboard-content" id="dashboard">
          {isAdmin ? (
            <AdminPanel
              onNavigate={(route) => {
                window.location.hash = route;
              }}
              route={activeRoute}
            />
          ) : (
            <TeacherPanel
              displayName={displayName}
              email={profileEmail}
              onNavigate={(route) => {
                window.location.hash = route;
              }}
              onProfileChange={setDisplayName}
              route={activeRoute}
            />
          )}
        </main>

        {profileModalOpen && (
          <div
            className="profile-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setProfileModalOpen(false);
              }
            }}
          >
            <section
              aria-labelledby="profile-modal-title"
              aria-modal="true"
              className="profile-modal"
              role="dialog"
            >
              <div className="profile-modal-heading">
                <div>
                  <span className="profile-modal-eyebrow">
                    {isAdmin ? "SIPENA · ADMIN SEKOLAH" : "SIPENA · GURU PENGAJAR"}
                  </span>
                  <h2 id="profile-modal-title">Edit Profil &amp; Keamanan Akun</h2>
                </div>
                <button
                  aria-label="Tutup"
                  className="profile-modal-close"
                  onClick={() => setProfileModalOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>

              <div className="profile-modal-summary">
                <span className="profile-popover-avatar" aria-hidden="true">
                  {initial}
                </span>
                <div>
                  <strong>{displayName}</strong>
                  <p>
                    {isAdmin ? "Admin Sekolah" : `Guru Mata Pelajaran${profileNip ? ` · NIP ${profileNip}` : ""}`}
                  </p>
                  <span className="profile-status-badge">{profileStatus}</span>
                </div>
              </div>

              <form className="profile-modal-form" onSubmit={handleSaveProfile}>
                <label>
                  Nama lengkap
                  <input defaultValue={displayName} name="name" required type="text" />
                </label>
                <label>
                  Email login
                  <input defaultValue={profileEmail} name="email" required type="email" />
                </label>
                {!isAdmin && (
                  <label>
                    NIP Guru
                    <input disabled readOnly type="text" value={profileNip || "—"} />
                  </label>
                )}
                <label>
                  Kata sandi baru <span>(opsional, min. 8 karakter)</span>
                  <input
                    autoComplete="new-password"
                    name="newPassword"
                    placeholder="Kosongkan jika tidak ingin mengubah kata sandi"
                    type="password"
                  />
                </label>
                <label>
                  Konfirmasi kata sandi baru
                  <input
                    autoComplete="new-password"
                    name="confirmation"
                    placeholder="Ulangi kata sandi baru"
                    type="password"
                  />
                </label>

                {profileError && (
                  <p className="profile-modal-error" role="alert">
                    {profileError}
                  </p>
                )}
                {profileNotice && (
                  <p className="profile-modal-notice" role="status">
                    {profileNotice}
                  </p>
                )}

                <div className="profile-modal-actions">
                  <button
                    className="profile-modal-btn secondary"
                    onClick={() => setProfileModalOpen(false)}
                    type="button"
                  >
                    Tutup
                  </button>
                  <button
                    className="profile-modal-btn primary"
                    disabled={isSavingProfile}
                    type="submit"
                  >
                    {isSavingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
