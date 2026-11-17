import DashboardIcon, { type NavItem } from "./DashboardIcon";

const mobileLabels: Record<string, string> = {
  Dashboard: "Beranda",
  "Data Siswa": "Siswa",
  "Data Guru": "Guru",
  "Data Kelas": "Kelas",
  "Mata Pelajaran": "Mapel",
  "Pembagian Tugas Guru": "Tugas Guru",
  "Nilai Kelas": "Nilai",
  "Pengaturan Komponen Nilai": "Komponen",
  "Input dan Kelola Nilai": "Input Nilai",
};

interface DashboardMobileNavProps {
  isAdmin: boolean;
  navigation: NavItem[];
  activeRoute: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onConfirmNavigation: (targetRoute?: string) => boolean;
  onLogout: () => void;
}

function DashboardMobileNav({
  isAdmin,
  navigation,
  activeRoute,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onConfirmNavigation,
  onLogout,
}: DashboardMobileNavProps) {
  return (
    <>
      <header className="mobile-dashboard-header">
        <a
          className="dashboard-brand mobile-brand"
          href="#dashboard"
          aria-label="SIPENA dashboard"
          onClick={(event) => {
            if (!onConfirmNavigation("dashboard")) {
              event.preventDefault();
            }
          }}
        >
          <DashboardIcon name="brand" />
          <strong>SIPENA</strong>
        </a>
        <button
          aria-controls="mobile-dashboard-menu"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          className="mobile-menu-toggle"
          onClick={onToggleMenu}
          type="button"
        >
          <DashboardIcon name="menu" />
        </button>
        <div
          aria-hidden={!menuOpen}
          className={`mobile-menu${menuOpen ? " open" : ""}`}
          id="mobile-dashboard-menu"
        >
          {navigation.map((item) => (
            <a
              aria-current={item.href === `#${activeRoute}` ? "page" : undefined}
              aria-label={item.label}
              href={item.href}
              key={item.label}
              onClick={(event) => {
                if (!onConfirmNavigation(item.href)) {
                  event.preventDefault();
                  return;
                }
                onCloseMenu();
              }}
            >
              <DashboardIcon name={item.icon} />
              <span>
                {item.label === "Dashboard" && !isAdmin
                  ? item.label
                  : mobileLabels[item.label] ?? item.label}
              </span>
            </a>
          ))}
          <button
            onClick={() => {
              if (!onConfirmNavigation("__logout__")) return;
              onLogout();
            }}
            type="button"
          >
            <DashboardIcon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {isAdmin && (
        <nav className="admin-bottom-nav" aria-label="Navigasi admin">
          {(
            [
              ["dashboard", "Dashboard", "dashboard"],
              ["students", "Siswa", "students"],
              ["teachers", "Guru", "teacher"],
            ] as const
          ).map(([route, label, icon]) => (
            <a
              aria-current={activeRoute === route ? "page" : undefined}
              href={`#${route}`}
              key={route}
            >
              <DashboardIcon name={icon} />
              <span>{label}</span>
            </a>
          ))}
          <button aria-expanded={menuOpen} onClick={onToggleMenu} type="button">
            <DashboardIcon name="menu" />
            <span>Semua Menu</span>
          </button>
        </nav>
      )}
      {!isAdmin && (
        <nav className="teacher-bottom-nav" aria-label="Navigasi guru">
          {(
            [
              ["dashboard", "Dashboard", "dashboard"],
              ["assignments", "Pengajaran", "subjects"],
              ["grade-entry", "Input Nilai", "grades"],
            ] as const
          ).map(([route, label, icon]) => (
            <a
              aria-current={activeRoute === route ? "page" : undefined}
              href={`#${route}`}
              key={route}
              onClick={(event) => {
                if (!onConfirmNavigation(route)) {
                  event.preventDefault();
                }
              }}
            >
              <DashboardIcon name={icon} />
              <span>{label}</span>
            </a>
          ))}
          <button aria-expanded={menuOpen} onClick={onToggleMenu} type="button">
            <DashboardIcon name="menu" />
            <span>Semua Menu</span>
          </button>
        </nav>
      )}
    </>
  );
}

export default DashboardMobileNav;
