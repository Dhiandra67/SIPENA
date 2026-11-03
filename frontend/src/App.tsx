import { useEffect, useState } from "react";
import { clearAccessToken, getStoredAccessToken, logout, restoreSession } from "./pages/Login/auth";
import type { AuthUser } from "./pages/Login/auth";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    restoreSession()
      .then((restoredUser) => {
        if (isMounted) {
          setUser(restoredUser);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to restore SIPENA session.", error);
      })
      .finally(() => {
        if (isMounted) {
          setIsRestoringSession(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleLogout() {
    setUser(null);
    const accessToken = getStoredAccessToken();

    if (accessToken) {
      void logout(accessToken).catch((error: unknown) => {
        clearAccessToken();
        console.error("Failed to revoke SIPENA session.", error);
      });
    }
  }

  if (isRestoringSession) {
    return <main className="session-loading">Memeriksa sesi...</main>;
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={setUser} />
  );
}

export default App;
