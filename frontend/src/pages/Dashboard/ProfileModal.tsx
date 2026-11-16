import { FormEvent, useState } from "react";
import { getStoredAccessToken } from "../Login/auth";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

interface ProfileModalProps {
  isAdmin: boolean;
  displayName: string;
  profileEmail: string;
  profileNip: string;
  profileStatus: string;
  initial: string;
  onClose: () => void;
  onProfileUpdated: (data: { name: string; email: string; nip?: string }) => void;
}

function ProfileModal({
  isAdmin,
  displayName,
  profileEmail,
  profileNip,
  profileStatus,
  initial,
  onClose,
  onProfileUpdated,
}: ProfileModalProps) {
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

      onProfileUpdated({
        name: payload?.data?.name ?? name,
        email: payload?.data?.email ?? nextEmail,
        nip: payload?.data?.nip !== undefined ? (payload.data.nip ?? "") : undefined,
      });
      setProfileNotice(payload?.message ?? "Profil akun berhasil diperbarui.");
    } catch {
      setProfileError("Tidak dapat terhubung ke server backend. Perubahan tidak disimpan.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div
      className="profile-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
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
            onClick={onClose}
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
              {isAdmin
                ? "Admin Sekolah"
                : `Guru Mata Pelajaran${profileNip ? ` · NIP ${profileNip}` : ""}`}
            </p>
            <span className="profile-status-badge">{profileStatus}</span>
          </div>
        </div>

        <form className="profile-modal-form" onSubmit={(event) => void handleSaveProfile(event)}>
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
              onClick={onClose}
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
  );
}

export default ProfileModal;
