import { useEffect, useRef } from "react";

interface DashboardTopbarProps {
  isAdmin: boolean;
  displayName: string;
  profileEmail: string;
  profileNip: string;
  profileStatus: string;
  initial: string;
  profileMenuOpen: boolean;
  onToggleProfileMenu: () => void;
  onCloseProfileMenu: () => void;
  onOpenProfileModal: () => void;
  onConfirmNavigation: (targetRoute?: string) => boolean;
  onLogout: () => void;
}

function DashboardTopbar({
  isAdmin,
  displayName,
  profileEmail,
  profileNip,
  profileStatus,
  initial,
  profileMenuOpen,
  onToggleProfileMenu,
  onCloseProfileMenu,
  onOpenProfileModal,
  onConfirmNavigation,
  onLogout,
}: DashboardTopbarProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onCloseProfileMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseProfileMenu();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen, onCloseProfileMenu]);

  return (
    <header className="dashboard-topbar">
      <span>{isAdmin ? "Panel Administrasi" : "Guru Mata Pelajaran"}</span>
      <div className="topbar-user-container" ref={popoverRef}>
        <button
          aria-expanded={profileMenuOpen}
          aria-haspopup="dialog"
          className="topbar-user-button"
          onClick={onToggleProfileMenu}
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
                onClick={onOpenProfileModal}
                type="button"
              >
                Edit Profil &amp; Ubah Sandi
              </button>
              <button
                className="profile-popover-action danger"
                onClick={() => {
                  if (!onConfirmNavigation("__logout__")) return;
                  onLogout();
                }}
                type="button"
              >
                Keluar (Logout)
              </button>
            </div>
          </section>
        )}
      </div>
    </header>
  );
}

export default DashboardTopbar;
