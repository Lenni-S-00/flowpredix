// App.jsx
import { useEffect, useState } from "react";

import Login from "./Login";
import Dashboard from "./Dashboard";
import SessionExpired from "./ui_features/sessionExpired";

const getStoredToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("authToken");

const clearAuthentication = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("access");
  localStorage.removeItem("authToken");
  localStorage.removeItem("refresh");
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(getStoredToken())
  );
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true);
    };

    window.addEventListener("session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener(
        "session-expired",
        handleSessionExpired
      );
    };
  }, []);

  const handleLoginSuccess = () => {
    setSessionExpired(false);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearAuthentication();
    setSessionExpired(false);
    setIsAuthenticated(false);
  };

  const handleLoginAgain = () => {
    clearAuthentication();
    setSessionExpired(false);
    setIsAuthenticated(false);
  };

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}

      {sessionExpired && (
        <SessionExpired onLogin={handleLoginAgain} />
      )}
    </>
  );
}