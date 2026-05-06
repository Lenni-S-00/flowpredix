// dashboard/HourFilter.jsx
import { useEffect, useRef, useState } from "react";
import "./dayFilter.css";

function HourFilter() {
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("Tämä viikko");

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

  return (
    <div className="day-filters">
      <div className="location-dropdown" ref={locationMenuRef}>
        <button
          type="button"
          className="location-trigger"
          onClick={() => setShowLocationMenu((prev) => !prev)}
        >
          <span>⌖</span>

          <span className="location-trigger-text">
            {selectedLocations.length === 0
              ? "Valitse toimipisteet"
              : selectedLocations.join(", ")}
          </span>

          <span className={`dropdown-arrow ${showLocationMenu ? "open" : ""}`}>
            ⌄
          </span>
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

      <select
        className="forecast-select"
        value={selectedWeek}
        onChange={(e) => setSelectedWeek(e.target.value)}
      >
        <option>Tämä viikko</option>
        <option>Viime viikko</option>
        <option>2 viikkoa sitten</option>
        <option>3 viikkoa sitten</option>
        <option>4 viikkoa sitten</option>
      </select>

      <button type="button" className="day-submit">
        Näytä
      </button>
    </div>
  );
}

export default HourFilter;