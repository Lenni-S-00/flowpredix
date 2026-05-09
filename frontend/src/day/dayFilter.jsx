import { useEffect, useRef, useState } from "react";
import Calendar from "../sidebar/calendar";
import "./dayFilter.css";

function DayFilter({ onApply }) {
  const [mode, setMode] = useState("realized");
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [forecastRange, setForecastRange] = useState("2 viikkoa");

  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const locationMenuRef = useRef(null);

  const locations = ["Kaikki toimipisteet", "Lab1", "Lab2", "Lab3"];

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        locationMenuRef.current &&
        !locationMenuRef.current.contains(event.target)
      ) {
        setShowLocationMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleLocation = (location) => {
    setSelectedLocations((prev) =>
      prev.includes(location)
        ? prev.filter((item) => item !== location)
        : [...prev, location]
    );
  };

  const applyFilters = () => {
    onApply?.({
      mode,
      selectedLocations,
      forecastRange,
      dateRange,
    });
  };

  return (
    <div className="day-filters">
      <div className="day-mode-row">
        <button
          type="button"
          className={`day-mode-button ${mode === "realized" ? "active" : ""}`}
          onClick={() => setMode("realized")}
        >
          <span className="fake-checkbox">
            {mode === "realized" ? "✓" : ""}
          </span>
          Toteutuneet
        </button>

        <button
          type="button"
          className={`day-mode-button ${mode === "forecast" ? "active" : ""}`}
          onClick={() => setMode("forecast")}
        >
          <span className="fake-checkbox">
            {mode === "forecast" ? "✓" : ""}
          </span>
          Ennuste
        </button>
      </div>

      <div className="location-dropdown" ref={locationMenuRef}>
        <button
          type="button"
          className="location-trigger"
          onClick={() => setShowLocationMenu((prev) => !prev)}
        >
          <span className="location-trigger-text">
            {selectedLocations.length === 0
              ? "Valitse toimipisteet"
              : selectedLocations.join(", ")}
          </span>

          <span>📍</span>
        </button>

        {showLocationMenu && (
          <div className="location-list">
            <div className="location-actions">
              <span className="location-actions-title">Toimipisteet</span>

              <button
                type="button"
                className="clear-locations-inline"
                disabled={selectedLocations.length === 0}
                onClick={() => setSelectedLocations([])}
              >
                Tyhjennä
              </button>
            </div>

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
        )}
      </div>

      {mode === "realized" && (
        <>
          <Calendar
            value={dateRange}
            onChange={setDateRange}
            placeholder="Valitse aikaväli"
          />

          <button type="button" className="day-submit" onClick={applyFilters}>
            Näytä toteutuneet
          </button>
        </>
      )}

      {mode === "forecast" && (
        <>
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

          <button type="button" className="day-submit" onClick={applyFilters}>
            Näytä ennuste
          </button>
        </>
      )}
    </div>
  );
}

export default DayFilter;