import { useEffect, useRef, useState } from "react";
import "./hourFilter.css";
import Calendar from "../sidebar/calendar";

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

function HourFilter({ onSubmit }) {
  const [mode, setMode] = useState("realized");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [forecastRange, setForecastRange] = useState("24 tuntia");

  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const locationMenuRef = useRef(null);

  const locations = [
    "Kaikki toimipisteet",
    "Lab1",
    "Lab2",
    "Lab3",
    "Lab4",
    "Lab5",
    "Lab6",
  ];

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

  const selectLocation = (location) => {
    setSelectedLocation(location);
    setShowLocationMenu(false);
  };

  const handleSubmit = () => {
    const normalizedStartDate = startOfDay(dateRange.startDate);
    const normalizedEndDate = startOfDay(dateRange.endDate);
    const endDateExclusive = addOneDay(normalizedEndDate);

    onSubmit({
      mode,
      selectedLocation,
      forecastRange,
      hasApplied: true,
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
            {!selectedLocation ? "Valitse toimipiste" : selectedLocation}
          </span>
          <span>📍</span>
        </button>

        {showLocationMenu && (
          <div className="location-list">
            <div className="location-actions">
              <span className="location-actions-title">Toimipiste</span>

              <button
                type="button"
                className="clear-locations-inline"
                disabled={!selectedLocation}
                onClick={() => setSelectedLocation("")}
              >
                Tyhjennä
              </button>
            </div>

            {locations.map((location) => (
              <label key={location} className="location-item">
                <input
                  type="radio"
                  name="hour-location"
                  checked={selectedLocation === location}
                  onChange={() => selectLocation(location)}
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
            placeholder="Valitse ajanjakso"
            selectionMode="range"
          />

          <button type="button" className="day-submit" onClick={handleSubmit}>
            Näytä tuntidata
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
            <option>1 viikko</option>
            <option>2 viikkoa</option>
            <option>1 kuukausi</option>
            <option>2 kuukautta</option>
          </select>

          <button type="button" className="day-submit" onClick={handleSubmit}>
            Näytä tuntiennuste
          </button>
        </>
      )}
    </div>
  );
}

export default HourFilter;