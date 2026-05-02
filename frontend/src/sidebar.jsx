/* sivupalkin sisältö, täytyy ehkä myöhemmin pilkkoa välilehti kohtaiseksi kun tavaraa tulee lisää */

import "./sidebar.css";

function Sidebar({ setView, activeView }) {
  return (
    <div className="sidebar">
      <h2 className="sidebar-title">FlowPredictor</h2>

      <button
        className={`sidebar-button ${activeView === "home" ? "active" : ""}`}
        onClick={() => setView("home")}
      >
        Työpöytä
      </button>

      <button
        className={`sidebar-button ${activeView === "summary" ? "active" : ""}`}
        onClick={() => setView("summary")}
      >
        Yhteenveto
      </button>

      <button
        className={`sidebar-button ${activeView === "add" ? "active" : ""}`}
        onClick={() => setView("add")}
      >
        Tiedoston lisäys
      </button>
    </div>
  );
}

export default Sidebar;