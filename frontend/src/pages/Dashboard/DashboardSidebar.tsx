import DashboardIcon, { type NavItem } from "./DashboardIcon";

interface DashboardSidebarProps {
  isAdmin: boolean;
  navigation: NavItem[];
  activeRoute: string;
  onConfirmNavigation: (targetRoute?: string) => boolean;
  onLogout: () => void;
}

function DashboardSidebar({
  isAdmin,
  navigation,
  activeRoute,
  onConfirmNavigation,
  onLogout,
}: DashboardSidebarProps) {
  return (
    <aside className="dashboard-sidebar">
      <a
        className="dashboard-brand"
        href="#dashboard"
        aria-label="SIPENA dashboard"
        onClick={(event) => {
          if (!onConfirmNavigation("dashboard")) {
            event.preventDefault();
          }
        }}
      >
        <DashboardIcon name="brand" />
        <span>
          <strong>SIPENA</strong>
          <small>{isAdmin ? "ADMIN PANEL" : "GURU MATA PELAJARAN"}</small>
        </span>
      </a>
      <nav className="sidebar-navigation" aria-label="Navigasi utama">
        {navigation.map((item) => (
          <a
            aria-current={item.href === `#${activeRoute}` ? "page" : undefined}
            className={
              item.href === `#${activeRoute}` ? "navigation-link active" : "navigation-link"
            }
            href={item.href}
            key={item.label}
            onClick={(event) => {
              if (!onConfirmNavigation(item.href)) {
                event.preventDefault();
              }
            }}
          >
            <DashboardIcon name={item.icon} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
      <button
        className="sidebar-logout"
        onClick={() => {
          if (!onConfirmNavigation("__logout__")) return;
          onLogout();
        }}
        type="button"
      >
        <DashboardIcon name="logout" />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default DashboardSidebar;
