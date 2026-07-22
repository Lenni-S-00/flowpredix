import { useState } from "react";

import API from "./api";
import "./login.css";

export default function Login() {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const login = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError(
        "Syötä käyttäjätunnus ja salasana."
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await API.post(
        "token/",
        {
          username,
          password,
        }
      );

      localStorage.setItem(
        "access",
        res.data.access
      );

      localStorage.setItem(
        "refresh",
        res.data.refresh
      );

      window.location.reload();
    } catch (requestError) {
      console.error(
        "Kirjautuminen epäonnistui:",
        requestError.response?.data ||
          requestError
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
        <div className="login-brand">
          <div className="login-logo">
            FP
          </div>

          <div>
            <span className="login-brand-name">
              FlowPredictor
            </span>

            <span className="login-brand-description">
              Arvailusta ennakointiin
            </span>
          </div>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">
            Tervetuloa takaisin
          </span>

          <h1>Kirjaudu sisään</h1>

          <p>
            Syötä käyttäjätunnuksesi ja
            salasanasi jatkaaksesi
            palveluun.
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
            <span>Käyttäjätunnus</span>

            <input
              id="username"
              name="username"
              type="text"
              value={username}
              placeholder="Syötä käyttäjätunnus"
              autoComplete="username"
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
            />
          </label>

          <label
            className="login-field"
            htmlFor="password"
          >
            <span>Salasana</span>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              placeholder="Syötä salasana"
              autoComplete="current-password"
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
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
      </section>
    </main>
  );
}