import type { FormEvent, ReactNode } from "react";

interface ProfilePageProps {
  heading: ReactNode;
  profileName: string;
  profileEmail: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function ProfilePage({ heading, profileName, profileEmail, onSubmit }: ProfilePageProps) {
  return (
    <>
      {heading}
      <section className="teacher-card teacher-profile-card">
        <div className="teacher-profile-avatar" aria-hidden="true">{profileName.trim().charAt(0).toUpperCase() || "G"}</div>
        <div><h2>{profileName}</h2><p>Guru Mata Pelajaran · {profileEmail}</p><span className="teacher-status-chip">Akun aktif</span></div>
      </section>
      <form className="teacher-card teacher-profile-form" onSubmit={onSubmit}>
        <div className="teacher-card-heading"><div><h2>Informasi Profil</h2><p>Perbarui informasi yang digunakan pada akun Anda.</p></div></div>
        <div className="teacher-profile-fields">
          <label>Nama lengkap<input defaultValue={profileName} name="name" required /></label>
          <label>Email<input defaultValue={profileEmail} name="email" required type="email" /></label>
          <label>Kata sandi baru <span>(opsional)</span><input autoComplete="new-password" name="newPassword" type="password" /></label>
          <label>Konfirmasi kata sandi<input autoComplete="new-password" name="confirmation" type="password" /></label>
        </div>
        <div className="teacher-form-actions"><button className="teacher-primary-button" type="submit">Simpan perubahan</button></div>
      </form>
    </>
  );
}

export default ProfilePage;
