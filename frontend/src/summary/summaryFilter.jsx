import {
  useEffect,
  useRef,
  useState,
} from "react";

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

function SummaryFilter({
  initialLocation = "Kaikki näytteenotot",
  onApply,
}) {
  const [selectedLocation, setSelectedLocation] =
    useState(initialLocation);

  const [showLocationMenu, setShowLocationMenu] =
    useState(false);

  const locationMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        locationMenuRef.current &&
        !locationMenuRef.current.contains(
          event.target
        )
      ) {
        setShowLocationMenu(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  function selectLocation(location) {
    setSelectedLocation(location);
    setShowLocationMenu(false);
  }

  function clearLocation() {
    setSelectedLocation("");
  }

  function applyFilters() {
    onApply({
      selectedLocation:
        selectedLocation ||
        "Kaikki näytteenotot",
    });
  }

  return (
    <div className="summary-filters">
      <div
        className="location-dropdown"
        ref={locationMenuRef}
      >
        <button
          type="button"
          className="location-trigger"
          onClick={() =>
            setShowLocationMenu(
              (previous) => !previous
            )
          }
        >
          <span className="location-trigger-text">
            {selectedLocation ||
              "Valitse toimipiste"}
          </span>

          <span aria-hidden="true">📍</span>
        </button>

        {showLocationMenu && (
          <div className="location-list">
            <div className="location-actions">
              <span className="location-actions-title">
                Toimipiste
              </span>

              <button
                type="button"
                className="clear-locations-inline"
                disabled={!selectedLocation}
                onClick={clearLocation}
              >
                Tyhjennä
              </button>
            </div>

            <label className="location-item">
              <input
                type="radio"
                name="summary-location"
                checked={
                  selectedLocation ===
                  "Kaikki näytteenotot"
                }
                onChange={() =>
                  selectLocation(
                    "Kaikki näytteenotot"
                  )
                }
              />

              Kaikki näytteenotot
            </label>

            {LOCATIONS.map((location) => (
              <label
                key={location}
                className="location-item"
              >
                <input
                  type="radio"
                  name="summary-location"
                  checked={
                    selectedLocation === location
                  }
                  onChange={() =>
                    selectLocation(location)
                  }
                />

                {location}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="summary-fixed-range">
        <span className="summary-fixed-range-label">
          Tarkastelujakso
        </span>

        <p>
          Viimeiset 30 päivää verrattuna
          seuraaviin 30 päivään
        </p>
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