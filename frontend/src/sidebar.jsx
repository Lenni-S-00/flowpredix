/* sivupalkin sisältö, täytyy ehkä myöhemmin pilkkoa välilehti kohtaiseksi kun tavaraa tulee lisää */

import "./sidebar.css";
import DashboardSidebar from "./dashboard/dashboardSidebar.jsx";

function Sidebar({ setView, activeView }) {
  return (
    <div className="sidebar">

      {/* VALKOINEN KORTTI */}
      <div className="sidebar-card">

        {/* OTSIKKO */}
        <h2 className="sidebar-title">FlowPredictor</h2>

        {/* TYÖPÖYTÄ */}
        <button
          className={`sidebar-button ${activeView === "home" ? "active" : ""}`}
          onClick={() => setView("home")}
        >
          ⌂ Työpöytä
        </button>
        {activeView === "home" && <DashboardSidebar />}


        {/* YHTEENVETO */}
        <button
          className={`sidebar-button ${activeView === "summary" ? "active" : ""}`}
          onClick={() => setView("summary")}
        >
          ▥ Yhteenveto
        </button>

        {/* TYÖNTEKIJÄT */}
        <button
          className={`sidebar-button ${activeView === "employees" ? "active" : ""}`}
          onClick={() => setView("employees")}
        >
          ⦿ Työntekijät
        </button>

        {/* DEMOGRAFIA */}
        <button
            className={`sidebar-button ${activeView === "demographics" ? "active" : ""}`}
            onClick={() => setView("demographics")}
        >
            🗺 Demografia
        </button>

        {/* TIEDOSTON LISÄYS */}
        <button
          className={`sidebar-button ${activeView === "add" ? "active" : ""}`}
          onClick={() => setView("add")}
        >
          ＋ Tiedoston lisäys
        </button>

      </div>

    </div>
  );
}

export default Sidebar;
