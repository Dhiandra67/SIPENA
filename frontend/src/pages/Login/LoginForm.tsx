import { FormEvent, useState } from "react";
import { login, type AuthUser } from "./auth";
import LoginIcon from "./LoginIcon";

interface LoginFormProps {
  onLoginSuccess: (user: AuthUser) => void;
}

function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "info">("info");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const result = await login({ email: normalizedEmail, password }, rememberMe);
      setMessage(`Berhasil masuk. Selamat datang, ${result.user.name}.`);
      setMessageType("success");
      onLoginSuccess(result.user);
    } catch (error) {
      if (error instanceof TypeError) {
        setMessage("Tidak dapat terhubung ke server backend. Pastikan server backend sedang aktif.");
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menghubungi server. Silakan coba lagi.",
        );
      }
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-column" aria-label="Formulir masuk">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Masuk ke akun Anda</h2>

        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="input-wrap">
            <LoginIcon name="mail" className="field-icon" />
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
            <LoginIcon name="lock" className="field-icon" />
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
              <LoginIcon name={showPassword ? "eyeOff" : "eye"} />
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
                "Silakan hubungi admin sekolah untuk bantuan reset kata sandi akun Anda.",
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

        <button className="submit-button" disabled={isSubmitting} type="submit">
          <span>{isSubmitting ? "Memproses..." : "Masuk"}</span>
          {!isSubmitting && <LoginIcon name="arrow" />}
        </button>
      </form>
    </section>
  );
}

export default LoginForm;
