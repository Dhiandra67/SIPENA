import type { AuthUser } from "./auth";
import LoginForm from "./LoginForm";
import LoginIcon from "./LoginIcon";
import "./Login.css";

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

function LoginPage({ onLoginSuccess }: LoginProps) {
  return (
    <div className="page-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="SIPENA beranda">
          <LoginIcon name="brand" />
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

        <LoginForm onLoginSuccess={onLoginSuccess} />
      </main>

      <footer className="site-footer">
        <LoginIcon name="shield" />
        <span>Gunakan akun yang terdaftar di sekolah Anda.</span>
      </footer>
    </div>
  );
}

export default LoginPage;
