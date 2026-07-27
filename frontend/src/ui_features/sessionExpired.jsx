import "./sessionExpired.css";

function SessionExpired({ onLogin }) {
  return (
    <div className="session-expired-overlay">
      <div className="session-expired-card">
        <div className="session-expired-icon">!</div>

        <h2>Istuntosi on vanhentunut</h2>

        <p>
          Kirjautumisesi ei ole enää voimassa. Kirjaudu uudelleen jatkaaksesi
          sovelluksen käyttöä.
        </p>

        <button
          type="button"
          className="session-expired-button"
          onClick={onLogin}
        >
          Kirjaudu uudelleen
        </button>
      </div>
    </div>
  );
}

export default SessionExpired;