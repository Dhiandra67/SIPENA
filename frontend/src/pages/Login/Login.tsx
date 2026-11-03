import { FormEvent, useState } from "react";
import { login } from "./auth";
import type { AuthUser } from "./auth";
import "./Login.css";

type IconName = "brand" | "mail" | "lock" | "eye" | "eyeOff" | "arrow" | "shield";

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

function Icon({ name, className }: { name: IconName; className?: string }) {
  const sharedProps = {
    className,
    "aria-hidden": true as const,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "brand":
      return (
        <span className={`brand-mark ${className ?? ""}`} aria-hidden="true">
          R
        </span>
      );
    case "mail":
      return (
        <svg {...sharedProps}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...sharedProps}>
          <rect x="4.5" y="10" width="15" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
        </svg>
      );
    case "eye":
      return (
        <svg {...sharedProps}>
          <path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "eyeOff":
      return (
        <svg {...sharedProps}>
          <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.3 0 9.5 6 9.5 6a15 15 0 0 1-3.2 3.8M6.2 6.9C3.8 8.4 2.5 12 2.5 12s3.2 6 9.5 6a9.9 9.9 0 0 0 3-.5" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...sharedProps}>
          <path d="M4.5 12h15m-6-6 6 6-6 6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...sharedProps}>
          <path d="M12 3 19 6v5c0 4.6-2.9 8-7 10-4.1-2-7-5.4-7-10V6l7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.5-3.8" />
        </svg>
      );
  }
}

function LoginPage({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "info">(
    "info",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await login({ email: email.trim(), password }, rememberMe);
      setMessage(`Berhasil masuk. Selamat datang, ${result.user.name}.`);
      setMessageType("success");
      onLoginSuccess(result.user);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghubungi server. Silakan coba lagi.",
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="SIPENA beranda">
          <Icon name="brand" />
          <span>SIPENA</span>
        </a>
      </header>

      <main className="login-layout">
        <section className="welcome-copy" aria-labelledby="welcome-heading">
          <span className="welcome-rule" aria-hidden="true" />
          <h1 id="welcome-heading">
            Selamat datang
            <br className="desktop-break" /> kembali.
          </h1>
          <p>Masuk untuk mengelola kelas, penilaian, dan nilai siswa Anda.</p>
        </section>

        <section className="login-column" aria-label="Formulir masuk">
          <form className="login-card" onSubmit={handleSubmit}>
            <h2>Masuk ke akun Anda</h2>

            {import.meta.env.DEV && (
              <aside className="demo-credentials" aria-label="Kredensial akun demo">
                <strong>Akun demo — hanya untuk demonstrasi</strong>
                <span>
                  Email: <code>test@example.com</code>
                </span>
                <span>
                  Kata sandi: <code>password</code>
                </span>
                <button
                  className="text-button demo-fill-button"
                  onClick={() => {
                    setEmail("test@example.com");
                    setPassword("password");
                  }}
                  type="button"
                >
                  Gunakan akun demo
                </button>
              </aside>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="input-wrap">
                <Icon name="mail" className="field-icon" />
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
                <Icon name="lock" className="field-icon" />
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
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} />
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
                onClick={() => {
                  setMessage(
                    "Hubungi admin sekolah untuk mendapatkan bantuan reset kata sandi.",
                  );
                  setMessageType("info");
                }}
                type="button"
              >
                Lupa kata sandi?
              </button>
            </div>

            {message && (
              <p className={`form-message ${messageType}`} role="status">
                {message}
              </p>
            )}

            <button
              className="submit-button"
              disabled={isSubmitting}
              type="submit"
            >
              <span>{isSubmitting ? "Memproses..." : "Masuk"}</span>
              {!isSubmitting && <Icon name="arrow" />}
            </button>
          </form>

          <p className="contact-copy">
            Belum memiliki akun atau sulit masuk?
            <br />
            <button
              className="text-button contact-link"
              onClick={() => {
                setMessage(
                  "Silakan hubungi admin sekolah untuk membuat atau memulihkan akun.",
                );
                setMessageType("info");
              }}
              type="button"
            >
              Hubungi admin sekolah
            </button>
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <Icon name="shield" />
        <span>Gunakan akun yang terdaftar di sekolah Anda.</span>
      </footer>
    </div>
  );
}

export default LoginPage;
