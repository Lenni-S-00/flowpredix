import { useState } from "react";

import API from "./api";
import "./login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Syötä käyttäjätunnus ja salasana.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await API.post("token/", {
        username,
        password,
      });

      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);

      window.location.reload();
    } catch (requestError) {
      console.error(
        "Kirjautuminen epäonnistui:",
        requestError.response?.data || requestError
      );

      setError(
        "Kirjautuminen epäonnistui. Tarkista käyttäjätunnus ja salasana."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <img
            src="/flowpredictor_logo.png"
            alt="FlowPredictor logo"
            className="login-logo-image"
          />
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">
            Tervetuloa takaisin
          </span>

          <h1>Kirjaudu sisään</h1>

          <p>
            Syötä käyttäjätunnuksesi ja salasanasi.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={login}
        >
          <label
            className="login-field"
            htmlFor="username"
          >

            <input
              id="username"
              name="username"
              type="text"
              value={username}
              placeholder="Käyttäjätunnus"
              autoComplete="username"
              onChange={(event) =>
                setUsername(event.target.value)
              }
            />
          </label>

          <label
            className="login-field"
            htmlFor="password"
          >

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              placeholder="Salasana"
              autoComplete="current-password"
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />
          </label>

          {error && (
            <div
              className="login-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Kirjaudutaan..."
              : "Kirjaudu sisään"}
          </button>
        </form>

        <p className="login-footer">
          FlowPredictor tukee organisaatioiden toimintaa
          ennakoimalla tulevaa kuormitusta.
        </p>

        <div className="login-secondary-logo">
          <img
            src="/cele_logo.png"
            alt="CeLe Solutions logo"
            className="login-secondary-logo-image"
          />
        </div>
      </section>
    </main>
  );
}