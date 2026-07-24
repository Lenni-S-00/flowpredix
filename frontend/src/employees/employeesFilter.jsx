import {
  useEffect,
  useRef,
  useState,
} from "react";
import "./employeesFilter.css";
import Calendar from "../sidebar/calendar";

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

// Palauttaa päivämäärän vuorokauden alusta.
function startOfDay(date) {
  if (!date) {
    return null;
  }

  const normalizedDate =
    new Date(date);

  normalizedDate.setHours(
    0,
    0,
    0,
    0
  );

  return normalizedDate;
}

// Lisää päivämäärään yhden päivän.
function addOneDay(date) {
  if (!date) {
    return null;
  }

  const nextDate =
    new Date(date);

  nextDate.setDate(
    nextDate.getDate() + 1
  );

  return nextDate;
}

// Näyttää henkilöstönäkymän suodattimet.
function EmployeesFilter({
  onSubmit,
}) {
  const [mode, setMode] =
    useState("realized");

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState("");

  const [
    forecastRange,
    setForecastRange,
  ] = useState("24 tuntia");

  const [
    dateRange,
    setDateRange,
  ] = useState({
    startDate: null,
    endDate: null,
  });

  const [
    showLocationMenu,
    setShowLocationMenu,
  ] = useState(false);

  const locationMenuRef =
    useRef(null);

  useEffect(() => {
    // Sulkee toimipistevalikon, kun käyttäjä klikkaa sen ulkopuolelle.
    function handleClickOutside(
      event
    ) {
      if (
        locationMenuRef.current &&
        !locationMenuRef.current.contains(
          event.target
        )
      ) {
        setShowLocationMenu(
          false
        );
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

  // Valitsee yhden toimipisteen ja sulkee valikon.
  function selectLocation(
    location
  ) {
    setSelectedLocation(
      location
    );

    setShowLocationMenu(
      false
    );
  }

  // Tyhjentää valitun toimipisteen.
  function clearLocation() {
    setSelectedLocation("");
    setShowLocationMenu(
      false
    );
  }

  // Välittää valitut suodattimet henkilöstönäkymälle.
  function handleSubmit() {
    const normalizedStartDate =
      startOfDay(
        dateRange.startDate
      );

    const normalizedEndDate =
      startOfDay(
        dateRange.endDate
      );

    const endDateExclusive =
      addOneDay(
        normalizedEndDate
      );

    onSubmit?.({
      mode,
      selectedLocation,
      forecastRange,
      hasApplied: true,
      dateRange: {
        startDate:
          normalizedStartDate,
        endDate:
          normalizedEndDate,
        endDateExclusive,
      },
    });
  }

  return (
    <div className="day-filters">
      <div className="day-mode-row">
        <button
          type="button"
          className={`day-mode-button ${
            mode === "realized"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setMode("realized")
          }
        >
          <span className="fake-checkbox">
            {mode === "realized"
              ? "✓"
              : ""}
          </span>

          Toteutuneet
        </button>

        <button
          type="button"
          className={`day-mode-button ${
            mode === "forecast"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setMode("forecast")
          }
        >
          <span className="fake-checkbox">
            {mode === "forecast"
              ? "✓"
              : ""}
          </span>

          Ennuste
        </button>
      </div>

      <div
        className="location-dropdown"
        ref={locationMenuRef}
      >
        <button
          type="button"
          className="location-trigger"
          onClick={() =>
            setShowLocationMenu(
              (previous) =>
                !previous
            )
          }
        >
          <span className="location-trigger-text">
            {selectedLocation ||
              "Valitse toimipiste"}
          </span>

          <span>📍</span>
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
                disabled={
                  !selectedLocation
                }
                onClick={
                  clearLocation
                }
              >
                Tyhjennä
              </button>
            </div>

            {LOCATIONS.map(
              (location) => (
                <label
                  key={location}
                  className="location-item"
                >
                  <input
                    type="radio"
                    name="employees-location"
                    checked={
                      selectedLocation ===
                      location
                    }
                    onChange={() =>
                      selectLocation(
                        location
                      )
                    }
                  />

                  {location}
                </label>
              )
            )}
          </div>
        )}
      </div>

      {mode === "realized" && (
        <>
          <Calendar
            value={dateRange}
            onChange={
              setDateRange
            }
            placeholder="Valitse ajanjakso"
            selectionMode="range"
          />

          <button
            type="button"
            className="day-submit"
            onClick={
              handleSubmit
            }
          >
            Näytä henkilöstötarve
          </button>
        </>
      )}

      {mode === "forecast" && (
        <>
          <select
            className="forecast-select"
            value={forecastRange}
            onChange={(event) =>
              setForecastRange(
                event.target.value
              )
            }
          >
            <option value="24 tuntia">
              24 tuntia
            </option>

            <option value="2 päivää">
              2 päivää
            </option>

            <option value="3 päivää">
              3 päivää
            </option>

            <option value="Viikko">
              Viikko
            </option>

            <option value="2 viikkoa">
              2 viikkoa
            </option>

            <option value="3 viikkoa">
              3 viikkoa
            </option>

            <option value="Kuukausi">
              Kuukausi
            </option>
          </select>

          <button
            type="button"
            className="day-submit"
            onClick={
              handleSubmit
            }
          >
            Näytä henkilöstötarve
          </button>
        </>
      )}
    </div>
  );
}

export default EmployeesFilter;