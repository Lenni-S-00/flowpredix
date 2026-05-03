import { useState } from "react";
import "./dashboardSidebar.css";

function DashboardSidebar() {
  const [mode, setMode] = useState("realized");
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [forecastRange, setForecastRange] = useState("2 viikkoa");

  // Kalenterin tila
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // huhtikuu 2026
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const locations = ["Kaikki toimipisteet", "Lab1", "Lab2", "Lab3"];

  const monthNames = [
    "tammikuu", "helmikuu", "maaliskuu", "huhtikuu",
    "toukokuu", "kesäkuu", "heinäkuu", "elokuu",
    "syyskuu", "lokakuu", "marraskuu", "joulukuu"
  ];

  const toggleLocation = (location) => {
    if (selectedLocations.includes(location)) {
      setSelectedLocations(selectedLocations.filter((item) => item !== location));
    } else {
      setSelectedLocations([...selectedLocations, location]);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
      return;
    }

    if (date < startDate) {
      setEndDate(startDate);
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  const isSameDate = (a, b) => {
    if (!a || !b) return false;
    return a.toDateString() === b.toDateString();
  };

  const isInRange = (date) => {
    if (!startDate || !endDate) return false;
    return date > startDate && date < endDate;
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7; // ma = 0

    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  return (
    <div className="dashboard-sidebar-panel">

      {/* Toteutuneet / Ennuste */}
      <div className="dashboard-mode-row">
        <button
          className={`dashboard-mode-button ${mode === "realized" ? "active" : ""}`}
          onClick={() => setMode("realized")}
        >
          <span className="fake-checkbox">{mode === "realized" ? "✓" : ""}</span>
          Toteutuneet
        </button>

        <button
          className={`dashboard-mode-button ${mode === "forecast" ? "active" : ""}`}
          onClick={() => setMode("forecast")}
        >
          <span className="fake-checkbox">{mode === "forecast" ? "✓" : ""}</span>
          Ennuste
        </button>
      </div>

      <div className="dashboard-divider" />

      {/* Toimipisteet */}
      <details className="location-dropdown">
        <summary>
          <span>⌖</span>
          <span>
            {selectedLocations.length === 0
              ? "Valitse toimipisteet"
              : selectedLocations.join(", ")}
          </span>
          <span className="dropdown-arrow">⌄</span>
        </summary>

        <div className="location-list">
          {locations.map((location) => (
            <label key={location} className="location-item">
              <input
                type="checkbox"
                checked={selectedLocations.includes(location)}
                onChange={() => toggleLocation(location)}
              />
              {location}
            </label>
          ))}
        </div>
      </details>

      <button
        className="clear-locations-button"
        disabled={selectedLocations.length === 0}
        onClick={() => setSelectedLocations([])}
      >
        Tyhjennä valitut yksiköt
      </button>

      {/* Toteutuneet */}
      {mode === "realized" && (
        <>
          <div className="dashboard-section-title">
            Valitse aikaväli
          </div>

          <div className="calendar-box">
            <div className="calendar-header">
              <button onClick={previousMonth}>‹</button>
              <div className="calendar-header-title">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <button onClick={nextMonth}>›</button>
            </div>

            <div className="calendar-grid">
              <div>ma</div>
              <div>ti</div>
              <div>ke</div>
              <div>to</div>
              <div>pe</div>
              <div className="weekend">la</div>
              <div className="weekend">su</div>

              {getCalendarDays().map((date, index) => (
                <button
                  key={index}
                  className={`
                    calendar-day
                    ${date && isSameDate(date, startDate) ? "selected" : ""}
                    ${date && isSameDate(date, endDate) ? "selected" : ""}
                    ${date && isInRange(date) ? "in-range" : ""}
                  `}
                  disabled={!date}
                  onClick={() => handleDateClick(date)}
                >
                  {date ? date.getDate() : ""}
                </button>
              ))}
            </div>
          </div>

          <button className="dashboard-submit">
            Näytä toteutuneet
          </button>
        </>
      )}

      {/* Ennuste */}
      {mode === "forecast" && (
        <>
          <div className="dashboard-section-title">
            Kuinka pitkälle ennuste näytetään?
          </div>

          <select
            className="forecast-select"
            value={forecastRange}
            onChange={(e) => setForecastRange(e.target.value)}
          >
            <option>2 viikkoa</option>
            <option>3 viikkoa</option>
            <option>Kuukausi</option>
            <option>2 kuukautta</option>
            <option>3 kuukautta</option>
            <option>6 kuukautta</option>
          </select>

          <button className="dashboard-submit">
            Näytä ennuste
          </button>
        </>
      )}
    </div>
  );
}

export default DashboardSidebar;