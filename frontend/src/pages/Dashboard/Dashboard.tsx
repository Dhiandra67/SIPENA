import { useEffect, useState } from "react";
import AdminPanel from "../Admin/AdminPanel";
import { getStoredAccessToken, type AuthUser } from "../Login/auth";
import TeacherPanel from "../Teacher/TeacherPanel";
import { adminNavigation, teacherNavigation } from "./DashboardIcon";
import DashboardMobileNav from "./DashboardMobileNav";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";
import ProfileModal from "./ProfileModal";
import "./Dashboard.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

interface DashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

function Dashboard({ user, onLogout }: DashboardProps) {
  const isAdmin = user.role.toLowerCase().includes("admin");
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.name || "Ibu Sari");
  const [profileEmail, setProfileEmail] = useState(user.email || "");
  const [profileNip, setProfileNip] = useState<string>("");
  const [profileStatus, setProfileStatus] = useState<string>("Aktif");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const navigation = isAdmin ? adminNavigation : teacherNavigation;
  const [activeRoute, setActiveRoute] = useState(
    () => window.location.hash.slice(1) || "dashboard",
  );
  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  function confirmAllowNavigation(targetRoute?: string): boolean {
    if (isAdmin || !hasUnsavedChanges) return true;
    const normalizedTarget = targetRoute?.replace(/^#/, "");
    if (normalizedTarget && normalizedTarget === activeRoute) return true;
    const allowed = window.confirm(
      "Ada perubahan nilai atau komponen yang belum disimpan ke database. Yakin ingin berpindah halaman tanpa menyimpan?",
    );
    if (allowed) {
      setHasUnsavedChanges(false);
    }
    return allowed;
  }

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
      .then(
        (
          payload: {
            data?: {
              name?: string;
              email?: string;
              nip?: string | null;
              status?: string;
            };
          } | null,
        ) => {
          if (payload?.data) {
            if (payload.data.name) setDisplayName(payload.data.name);
            if (payload.data.email) setProfileEmail(payload.data.email);
            if (payload.data.nip) setProfileNip(payload.data.nip);
            if (payload.data.status) setProfileStatus(payload.data.status);
          }
        },
      )
      .catch(() => {
        // Ignore background profile refresh error
      });
  }, []);

  return (
    <div className={`dashboard-app ${isAdmin ? "admin-dashboard" : "teacher-dashboard"}`}>
      <DashboardSidebar
        activeRoute={activeRoute}
        isAdmin={isAdmin}
        navigation={navigation}
        onConfirmNavigation={confirmAllowNavigation}
        onLogout={onLogout}
      />

      <div className="dashboard-main">
        <DashboardTopbar
          displayName={displayName}
          initial={initial}
          isAdmin={isAdmin}
          onCloseProfileMenu={() => setProfileMenuOpen(false)}
          onConfirmNavigation={confirmAllowNavigation}
          onLogout={onLogout}
          onOpenProfileModal={() => {
            setProfileMenuOpen(false);
            setProfileModalOpen(true);
          }}
          onToggleProfileMenu={() => setProfileMenuOpen((open) => !open)}
          profileEmail={profileEmail}
          profileMenuOpen={profileMenuOpen}
          profileNip={profileNip}
          profileStatus={profileStatus}
        />

        <DashboardMobileNav
          activeRoute={activeRoute}
          isAdmin={isAdmin}
          menuOpen={menuOpen}
          navigation={navigation}
          onCloseMenu={() => setMenuOpen(false)}
          onConfirmNavigation={confirmAllowNavigation}
          onLogout={onLogout}
          onToggleMenu={() => setMenuOpen((open) => !open)}
        />

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
              onNavigate={(route) => {
                window.location.hash = route;
              }}
              onUnsavedChange={setHasUnsavedChanges}
              route={activeRoute}
            />
          )}
        </main>

        {profileModalOpen && (
          <ProfileModal
            displayName={displayName}
            initial={initial}
            isAdmin={isAdmin}
            onClose={() => setProfileModalOpen(false)}
            onProfileUpdated={({ name, email, nip }) => {
              setDisplayName(name);
              setProfileEmail(email);
              if (nip !== undefined) {
                setProfileNip(nip);
              }
            }}
            profileEmail={profileEmail}
            profileNip={profileNip}
            profileStatus={profileStatus}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
