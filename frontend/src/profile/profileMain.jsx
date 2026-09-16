import { useEffect, useState } from "react";
import api from "../api";
import "./profileMain.css";

export default function ProfileMain() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sähköpostin muokkaus
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  // Salasanan muokkaus
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("profile/");

        setProfile(response.data);
        setNewEmail(response.data.email || "");
      } catch (err) {
        console.error("Profiilin haku epäonnistui:", err);
        setError("Profiilitietojen lataaminen epäonnistui.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ---------------------------------------------------------
  // Sähköpostin vaihto
  // ---------------------------------------------------------

  const handleEmailChange = async (event) => {
    event.preventDefault();

    setEmailError("");
    setEmailSuccess("");

    if (!newEmail.trim()) {
      setEmailError("Anna sähköpostiosoite.");
      return;
    }

    if (!emailPassword) {
      setEmailError("Anna nykyinen salasanasi.");
      return;
    }

    try {
      setEmailLoading(true);

      const response = await api.post(
        "profile/change-email/",
        {
          email: newEmail.trim(),
          current_password: emailPassword,
        }
      );

      setProfile((current) => ({
        ...current,
        email: response.data.email,
      }));

      setNewEmail(response.data.email);
      setEmailPassword("");
      setEditingEmail(false);

      setEmailSuccess(
        "Sähköpostiosoite päivitetty onnistuneesti."
      );
    } catch (err) {
      console.error(
        "Sähköpostin vaihto epäonnistui:",
        err
      );

      const backendError = err.response?.data?.error;

      if (Array.isArray(backendError)) {
        setEmailError(backendError.join(" "));
      } else if (backendError) {
        setEmailError(backendError);
      } else {
        setEmailError(
          "Sähköpostiosoitteen vaihtaminen epäonnistui."
        );
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const cancelEmailEdit = () => {
    setNewEmail(profile.email || "");
    setEmailPassword("");
    setEmailError("");
    setEditingEmail(false);
  };

  const openEmailEdit = () => {
    setEmailSuccess("");
    setEmailError("");
    setEmailPassword("");
    setNewEmail(profile.email || "");
    setEditingEmail(true);

    // Suljetaan toinen muokkaus samalla
    setEditingPassword(false);
    setPasswordError("");
  };

  // ---------------------------------------------------------
  // Salasanan vaihto
  // ---------------------------------------------------------

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (
      !currentPassword ||
      !newPassword ||
      !newPasswordConfirm
    ) {
      setPasswordError("Täytä kaikki salasanakentät.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setPasswordError(
        "Uudet salasanat eivät täsmää."
      );
      return;
    }

    try {
      setPasswordLoading(true);

      await api.post(
        "profile/change-password/",
        {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        }
      );

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");

      setEditingPassword(false);

      setPasswordSuccess(
        "Salasana vaihdettu onnistuneesti."
      );
    } catch (err) {
      console.error(
        "Salasanan vaihto epäonnistui:",
        err
      );

      const backendError = err.response?.data?.error;

      if (Array.isArray(backendError)) {
        setPasswordError(backendError.join(" "));
      } else if (backendError) {
        setPasswordError(backendError);
      } else {
        setPasswordError(
          "Salasanan vaihtaminen epäonnistui."
        );
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const cancelPasswordEdit = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setPasswordError("");
    setEditingPassword(false);
  };

  const openPasswordEdit = () => {
    setPasswordSuccess("");
    setPasswordError("");

    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");

    setEditingPassword(true);

    // Suljetaan sähköpostin muokkaus samalla
    setEditingEmail(false);
    setEmailPassword("");
    setEmailError("");
    setNewEmail(profile.email || "");
  };

  // ---------------------------------------------------------
  // Loading / error
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div className="profile-page">
        <p>Ladataan profiilia...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <p className="profile-error">
          {error}
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Oma profiili</h1>

        <p>
          Hallinnoi käyttäjätilisi tietoja ja asetuksia.
        </p>
      </div>

      {/* KÄYTTÄJÄTIEDOT */}

      <div className="profile-card">
        <h2>Käyttäjätiedot</h2>

        <div className="profile-info-grid">
          <div className="profile-field">
            <span className="profile-label">
              Käyttäjänimi
            </span>

            <span className="profile-value">
              {profile.username || "–"}
            </span>
          </div>

          <div className="profile-field">
            <span className="profile-label">
              Nimi
            </span>

            <span className="profile-value">
              {[profile.first_name, profile.last_name]
                .filter(Boolean)
                .join(" ") || "–"}
            </span>
          </div>

          <div className="profile-field">
            <span className="profile-label">
              Organisaatio
            </span>

            <span className="profile-value">
              {profile.organization || "–"}
            </span>
          </div>

          <div className="profile-field">
            <span className="profile-label">
              Käyttäjärooli
            </span>

            <span className="profile-value">
              {profile.role || "–"}
            </span>
          </div>
        </div>
      </div>

      {/* TILIASETUKSET */}

      <div className="profile-card profile-settings-card">
        <h2>Tiliasetukset</h2>

        {/* SÄHKÖPOSTI */}

        <div className="account-setting">
          <div className="account-setting-top">
            <div className="account-setting-info">
              <span className="profile-label">
                Sähköposti
              </span>

              <span className="account-setting-value">
                {profile.email || "Ei asetettu"}
              </span>
            </div>

            {!editingEmail && (
              <button
                type="button"
                className="profile-edit-button"
                onClick={openEmailEdit}
              >
                Muuta
              </button>
            )}
          </div>

          {emailSuccess && !editingEmail && (
            <div className="profile-message success">
              {emailSuccess}
            </div>
          )}

          {editingEmail && (
            <form
              className="account-edit-form"
              onSubmit={handleEmailChange}
            >
              <div className="account-input-group">
                <label htmlFor="new-email">
                  Uusi sähköpostiosoite
                </label>

                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) =>
                    setNewEmail(e.target.value)
                  }
                  autoComplete="email"
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="email-current-password">
                  Nykyinen salasana
                </label>

                <input
                  id="email-current-password"
                  type="password"
                  value={emailPassword}
                  onChange={(e) =>
                    setEmailPassword(e.target.value)
                  }
                  autoComplete="current-password"
                />
              </div>

              {emailError && (
                <div className="profile-message error">
                  {emailError}
                </div>
              )}

              <div className="account-form-actions">
                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={cancelEmailEdit}
                  disabled={emailLoading}
                >
                  Peruuta
                </button>

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={emailLoading}
                >
                  {emailLoading
                    ? "Tallennetaan..."
                    : "Tallenna"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="account-setting-divider" />

        {/* SALASANA */}

        <div className="account-setting">
          <div className="account-setting-top">
            <div className="account-setting-info">
              <span className="profile-label">
                Salasana
              </span>

              <span className="account-setting-value password-hidden">
                ••••••••••••
              </span>
            </div>

            {!editingPassword && (
              <button
                type="button"
                className="profile-edit-button"
                onClick={openPasswordEdit}
              >
                Muuta
              </button>
            )}
          </div>

          {passwordSuccess && !editingPassword && (
            <div className="profile-message success">
              {passwordSuccess}
            </div>
          )}

          {editingPassword && (
            <form
              className="account-edit-form"
              onSubmit={handlePasswordChange}
            >
              <div className="account-input-group">
                <label htmlFor="current-password">
                  Nykyinen salasana
                </label>

                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(e.target.value)
                  }
                  autoComplete="current-password"
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="new-password">
                  Uusi salasana
                </label>

                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  autoComplete="new-password"
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="new-password-confirm">
                  Uusi salasana uudelleen
                </label>

                <input
                  id="new-password-confirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) =>
                    setNewPasswordConfirm(e.target.value)
                  }
                  autoComplete="new-password"
                />
              </div>

              {passwordError && (
                <div className="profile-message error">
                  {passwordError}
                </div>
              )}

              <div className="account-form-actions">
                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={cancelPasswordEdit}
                  disabled={passwordLoading}
                >
                  Peruuta
                </button>

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={passwordLoading}
                >
                  {passwordLoading
                    ? "Tallennetaan..."
                    : "Tallenna"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}