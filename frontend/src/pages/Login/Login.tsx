import { FormEvent, useState } from "react";
import "./Login.css";

type LoginResponse = {
  message?: string;
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      const result = (await response.json().catch(() => ({}))) as LoginResponse;
      if (!response.ok) {
        throw new Error(
          result.message ??
            (response.status === 404
              ? "Endpoint login belum tersedia di backend."
              : "Email atau kata sandi tidak valid. Silakan coba lagi."),
        );
      }

      setMessage(result.message ?? "Login berhasil.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Tidak dapat menghubungi backend. Pastikan server Laravel sedang berjalan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="SIPENA beranda">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>SIPENA</span>
        </a>
      </header>

      <main className="login-layout">
        <section className="welcome-copy" aria-labelledby="welcome-heading">
          <span className="welcome-rule" aria-hidden="true" />
          <h1 id="welcome-heading">Selamat datang<br className="desktop-break" /> kembali.</h1>
          <p>Masuk untuk mengelola kelas, penilaian, dan nilai siswa Anda.</p>
        </section>

        <section className="login-column" aria-label="Formulir masuk">
          <form className="login-card" onSubmit={handleSubmit}>
            <h2>Masuk ke akun Anda</h2>
            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="input-wrap">
                <span className="field-icon" aria-hidden="true">✉</span>
                <input
                  autoComplete="email"
                  id="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Masukkan email Anda"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">Kata sandi</label>
              <div className="input-wrap">
                <span className="field-icon" aria-hidden="true">▣</span>
                <input
                  autoComplete="current-password"
                  id="password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? "◉" : "◎"}
                </button>
              </div>
            </div>
            <div className="form-options">
              <label className="remember-option">
                <input
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span>Ingat saya</span>
              </label>
              <button
                className="text-button forgot-link"
                onClick={() => setMessage("Hubungi admin sekolah untuk bantuan reset kata sandi.")}
                type="button"
              >
                Lupa kata sandi?
              </button>
            </div>
            {message && <p className="form-message" role="status">{message}</p>}
            <button className="submit-button" disabled={isSubmitting} type="submit">
              <span>{isSubmitting ? "Memproses..." : "Masuk"}</span>
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="contact-copy">
            Belum memiliki akun atau sulit masuk?
            <br />
            <button
              className="text-button contact-link"
              onClick={() => setMessage("Silakan hubungi admin sekolah untuk bantuan akun.")}
              type="button"
            >
              Hubungi admin sekolah
            </button>
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <span aria-hidden="true">♧</span>
        <span>Gunakan akun yang terdaftar di sekolah Anda.</span>
      </footer>
    </div>
  );
}

export default Login;
