import { useEffect, useRef, useState } from "react";
import "./summaryFilter.css";

const LOCATIONS = [
  "Lab1",
  "Lab2",
  "Lab3",
  "Lab4",
  "Lab5",
  "Lab6",
  "Lab7",
  "Lab8",
  "Lab9",
  "Lab10",
  "Lab11",
  "Lab12",
  "Lab13",
  "Lab14",
  "Lab15",
  "Lab16",
  "Lab17",
  "Lab18",
  "Lab19",
  "Lab20",
  "Lab21",
];

function SummaryFilter({ onApply }) {
  const [selectedLocation, setSelectedLocation] = useState(
    "Kaikki toimipisteet"
  );

  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const locationMenuRef = useRef(null);

  // Suljetaan pudotusvalikko, kun klikataan sen ulkopuolelle.
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

  // Valitaan yksi toimipiste.
  const selectLocation = (location) => {
    setSelectedLocation(location);
    setShowLocationMenu(false);
  };

  // Lähetetään valinta Summary-komponentille.
  const applyFilters = () => {
    onApply({
      selectedLocation,
    });
  };

  return (
    <div className="summary-filters">
      <div className="location-dropdown" ref={locationMenuRef}>
        <button
          type="button"
          className="location-trigger"
          onClick={() => setShowLocationMenu((prev) => !prev)}
        >
          <span className="location-trigger-text">{selectedLocation}</span>
          <span>📍</span>
        </button>

        {showLocationMenu && (
          <div className="location-list">
            <div className="location-actions">
              <span className="location-actions-title">Toimipiste</span>
            </div>

            <button
              type="button"
              className={`select-all-locations ${
                selectedLocation === "Kaikki näytteenotot" ? "active" : ""
              }`}
              onClick={() => selectLocation("Kaikki näytteenotot")}
            >
              <span className="select-all-radio"></span>
              Kaikki näytteenotot
            </button>

            <div className="location-divider" />

            {LOCATIONS.map((location) => (
              <button
                key={location}
                type="button"
                className={`select-all-locations ${
                  selectedLocation === location ? "active" : ""
                }`}
                onClick={() => selectLocation(location)}
              >
                <span className="select-all-radio"></span>
                {location}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="summary-submit"
        onClick={applyFilters}
      >
        Näytä yhteenveto
      </button>
    </div>
  );
}

export default SummaryFilter;