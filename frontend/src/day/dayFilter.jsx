// dashboard/DashboardFilters.jsx
import { useEffect, useRef, useState } from "react";
import "./dayFilter.css";

function DayFilter() {
  const [mode, setMode] = useState("realized");
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [forecastRange, setForecastRange] = useState("2 viikkoa");

  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const calendarRef = useRef(null);
  const closeTimerRef = useRef(null);

  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const locationMenuRef = useRef(null);

  const locations = ["Kaikki toimipisteet", "Lab1", "Lab2", "Lab3"];

  const monthNames = [
    "tammikuu", "helmikuu", "maaliskuu", "huhtikuu",
    "toukokuu", "kesäkuu", "heinäkuu", "elokuu",
    "syyskuu", "lokakuu", "marraskuu", "joulukuu"
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        setShowCalendar(false);
      }

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
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  const toggleLocation = (location) => {
    setSelectedLocations((prev) =>
      prev.includes(location)
        ? prev.filter((item) => item !== location)
        : [...prev, location]
    );
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (date) => {
    clearTimeout(closeTimerRef.current);

    if (!startDate || endDate) {
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

    closeTimerRef.current = setTimeout(() => {
      setShowCalendar(false);
    }, 700);
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
    const startDay = (firstDay.getDay() + 6) % 7;

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

  const formatDate = (date) => {
    if (!date) return "";
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  const rangeText =
    startDate && endDate
      ? `${formatDate(startDate)} – ${formatDate(endDate)}`
      : startDate
      ? `${formatDate(startDate)} –`
      : "Valitse aikaväli";

  return (
    <div className="day-filters">
      <div className="day-mode-row">
        <button
          className={`day-mode-button ${mode === "realized" ? "active" : ""}`}
          onClick={() => setMode("realized")}
        >
          <span className="fake-checkbox">
            {mode === "realized" ? "✓" : ""}
          </span>
          Toteutuneet
        </button>

        <button
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

      {mode === "realized" && (
        <>
          <div className="date-picker" ref={calendarRef}>
            <button
              type="button"
              className="date-input"
              onClick={() => setShowCalendar((prev) => !prev)}
            >
              <span>{rangeText}</span>
              <span>📅</span>
            </button>

            {showCalendar && (
              <div className="calendar-popup">
                <div className="calendar-header">
                  <button type="button" onClick={previousMonth}>
                    ‹
                  </button>

                  <div className="calendar-header-title">
                    {monthNames[currentDate.getMonth()]}{" "}
                    {currentDate.getFullYear()}
                  </div>

                  <button type="button" onClick={nextMonth}>
                    ›
                  </button>
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
                      type="button"
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
            )}
          </div>

          <button type="button" className="day-submit">
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

          <button type="button" className="day-submit">
            Näytä ennuste
          </button>
        </>
      )}
    </div>
  );
}

export default DayFilter;