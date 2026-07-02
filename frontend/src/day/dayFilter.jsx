import { useEffect, useRef, useState } from "react";
import Calendar from "../sidebar/calendar";
import "./dayFilter.css";

const LOCATIONS = ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6", "Lab7", "Lab8", "Lab9", "Lab10", "Lab11", "Lab12", "Lab13", "Lab14", "Lab15", "Lab16", "Lab17", "Lab18", "Lab19", "Lab20", "Lab21"];

const startOfDay = (date) => {
  if (!date) return null;

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  return d;
};

const addOneDay = (date) => {
  if (!date) return null;

  const d = new Date(date);
  d.setDate(d.getDate() + 1);

  return d;
};

function DayFilter({ onApply }) {
  const [mode, setMode] = useState("realized");
  const [selectedLocations, setSelectedLocations] = useState([
    "Kaikki näytteenotot",
  ]);
  const [forecastRange, setForecastRange] = useState("2 viikkoa");

  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const locationMenuRef = useRef(null);

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

  const selectAllLocations = () => {
    setSelectedLocations(["Kaikki näytteenotot"]);
  };

  const toggleLocation = (location) => {
    setSelectedLocations((prev) => {
      const withoutAll = prev.filter((item) => item !== "Kaikki näytteenotot");

      const next = withoutAll.includes(location)
        ? withoutAll.filter((item) => item !== location)
        : [...withoutAll, location];

      return next.length === 0 ? ["Kaikki näytteenotot"] : next;
    });
  };

  const applyFilters = () => {
    const normalizedStartDate = startOfDay(dateRange.startDate);
    const normalizedEndDate = startOfDay(dateRange.endDate);
    const endDateExclusive = addOneDay(normalizedEndDate);

    onApply?.({
      hasApplied: true,
      mode,
      selectedLocations,
      forecastRange,
      dateRange: {
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        endDateExclusive,
      },
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
          <span className="fake-checkbox">{mode === "realized" ? "✓" : ""}</span>
          Toteutuneet
        </button>

        <button
          type="button"
          className={`day-mode-button ${mode === "forecast" ? "active" : ""}`}
          onClick={() => setMode("forecast")}
        >
          <span className="fake-checkbox">{mode === "forecast" ? "✓" : ""}</span>
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
            {selectedLocations.join(", ")}
          </span>
          <span>📍</span>
        </button>

        {showLocationMenu && (
          <div className="location-list">
            <div className="location-actions">
              <span className="location-actions-title">Näytteenotot</span>
            </div>

            <button
              type="button"
              className={`select-all-locations ${
                selectedLocations.includes("Kaikki näytteenotot")
                  ? "active"
                  : ""
              }`}
              onClick={selectAllLocations}
            >
              <span className="select-all-radio"></span>
              Kaikki näytteenotot
            </button>

            <div className="location-divider" />

            {LOCATIONS.map((location) => (
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