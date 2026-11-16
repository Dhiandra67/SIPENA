import type { FormEvent, ReactNode } from "react";
import { getStoredAccessToken } from "../Login/auth";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

interface TeacherProfilePageProps {
  heading: ReactNode;
  profileName: string;
  profileEmail: string;
  onProfileSaved: (name: string, email: string, message: string) => void;
  onNotice: (message: string) => void;
}

function TeacherProfilePage({
  heading,
  profileName,
  profileEmail,
  onProfileSaved,
  onNotice,
}: TeacherProfilePageProps) {
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const name = String(formData.get("name") ?? "").trim();
    const nextEmail = String(formData.get("email") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (newPassword && newPassword.length < 8) {
      onNotice("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmation) {
      onNotice("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    const token = getStoredAccessToken();
    if (!token) {
      onNotice(
        "Sesi autentikasi tidak ditemukan atau server backend tidak aktif. Profil tidak diperbarui.",
      );
      return;
    }
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
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        onNotice(payload?.message ?? "Gagal memperbarui profil di server.");
        return;
      }
      const newPasswordInput = formElement.elements.namedItem(
        "newPassword",
      ) as HTMLInputElement | null;
      const confirmationInput = formElement.elements.namedItem(
        "confirmation",
      ) as HTMLInputElement | null;
      if (newPasswordInput) newPasswordInput.value = "";
      if (confirmationInput) confirmationInput.value = "";
      onProfileSaved(
        name,
        nextEmail,
        payload?.message ??
          (newPassword
            ? "Profil dan kata sandi berhasil diperbarui."
            : "Profil berhasil diperbarui."),
      );
    } catch {
      onNotice("Tidak dapat terhubung ke server backend. Profil gagal diperbarui.");
    }
  }

  return (
    <>
      {heading}
      <section className="teacher-card teacher-profile-card">
        <div className="teacher-profile-avatar" aria-hidden="true">
          {profileName.trim().charAt(0).toUpperCase() || "G"}
        </div>
        <div>
          <h2>{profileName}</h2>
          <p>Guru Mata Pelajaran · {profileEmail}</p>
          <span className="teacher-status-chip">Akun aktif</span>
        </div>
      </section>
      <form className="teacher-card teacher-profile-form" onSubmit={(event) => void saveProfile(event)}>
        <div className="teacher-card-heading">
          <div>
            <h2>Informasi Profil &amp; Ubah Kata Sandi</h2>
            <p>
              Perbarui informasi profil atau ganti kata sandi sementara (guru12345) dengan kata
              sandi baru Anda.
            </p>
          </div>
        </div>
        <div className="teacher-profile-fields">
          <label>
            Nama lengkap
            <input defaultValue={profileName} key={`name-${profileName}`} name="name" required />
          </label>
          <label>
            Email
            <input
              defaultValue={profileEmail}
              key={`email-${profileEmail}`}
              name="email"
              required
              type="email"
            />
          </label>
          <label>
            Kata sandi baru <span>(opsional, min. 8 karakter)</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="newPassword"
              placeholder="Kosongkan jika tidak ingin mengubah kata sandi"
              type="password"
            />
          </label>
          <label>
            Konfirmasi kata sandi baru
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirmation"
              placeholder="Ulangi kata sandi baru"
              type="password"
            />
          </label>
        </div>
        <div className="teacher-form-actions">
          <button className="teacher-primary-button" type="submit">
            Simpan perubahan
          </button>
        </div>
      </form>
    </>
  );
}

export default TeacherProfilePage;
