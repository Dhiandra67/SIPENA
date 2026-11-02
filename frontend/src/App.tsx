import { useState } from "react";
import type { AuthUser } from "./pages/Login/auth";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);

  function handleLogout() {
    window.localStorage.removeItem("sipena.accessToken");
    window.sessionStorage.removeItem("sipena.accessToken");
    setUser(null);
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={setUser} />
  );
}

export default App;
