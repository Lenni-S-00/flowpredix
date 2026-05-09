import { useEffect, useRef, useState } from "react";
import "./dataFilter.css";

function DataFilter() {
  const [selectedUnit, setSelectedUnit] = useState("Lab1");
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));

  const unitMenuRef = useRef(null);

  const units = ["Lab1", "Lab2", "Lab3"];

  const dataByUnit = {
    Lab1: [
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-06",
      "2026-04-07",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
      "2026-04-15",
      "2026-04-16",
      "2026-04-20",
    ],
    Lab2: [
      "2026-04-04",
      "2026-04-05",
      "2026-04-06",
      "2026-04-09",
      "2026-04-13",
      "2026-04-14",
      "2026-04-18",
      "2026-04-19",
    ],
    Lab3: [
      "2026-04-02",
      "2026-04-03",
      "2026-04-04",
      "2026-04-05",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-17",
      "2026-04-21",
    ],
  };

  const monthNames = [
    "tammikuu",
    "helmikuu",
    "maaliskuu",
    "huhtikuu",
    "toukokuu",
    "kesäkuu",
    "heinäkuu",
    "elokuu",
    "syyskuu",
    "lokakuu",
    "marraskuu",
    "joulukuu",
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (unitMenuRef.current && !unitMenuRef.current.contains(event.target)) {
        setShowUnitMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  const selectedDataDates = dataByUnit[selectedUnit] || [];

  const sortedDates = [...selectedDataDates].sort();

  const firstDataDate =
    sortedDates.length > 0 ? new Date(sortedDates[0]) : null;

  const lastDataDate =
    sortedDates.length > 0
      ? new Date(sortedDates[sortedDates.length - 1])
      : null;

  const hasData = (date) => selectedDataDates.includes(toDateKey(date));

  const isInsideDataRange = (date) => {
    if (!firstDataDate || !lastDataDate) return false;
    return date >= firstDataDate && date <= lastDataDate;
  };

  const isDataGap = (date) => {
    return isInsideDataRange(date) && !hasData(date);
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

  return (
    <div className="data-filters">
      <div className="data-dropdown" ref={unitMenuRef}>
        <button
          type="button"
          className="data-trigger"
          onClick={() => setShowUnitMenu((prev) => !prev)}
        >
          <span className="data-trigger-text">{selectedUnit}</span>
          <span>📍</span>
        </button>

        {showUnitMenu && (
          <div className="data-list">
            <div className="data-actions">
              <span className="data-actions-title">Yksikkö</span>
            </div>

            {units.map((unit) => (
              <button
                type="button"
                key={unit}
                className={`data-unit-item ${
                  selectedUnit === unit ? "active" : ""
                }`}
                onClick={() => {
                  setSelectedUnit(unit);
                  setShowUnitMenu(false);
                }}
              >
                {unit}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="data-range-card">
        <span className="data-range-label">Dataa lisätty ajalle</span>

        <strong>
          {firstDataDate && lastDataDate
            ? `${formatDate(firstDataDate)} – ${formatDate(lastDataDate)}`
            : "Ei dataa"}
        </strong>

        <small>{selectedDataDates.length} päivää dataa</small>
      </div>

      <div className="data-calendar-card">
        <div className="data-calendar-header">
          <button type="button" onClick={previousMonth}>
            ‹
          </button>

          <div className="data-calendar-title">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>

          <button type="button" onClick={nextMonth}>
            ›
          </button>
        </div>

        <div className="data-calendar-grid">
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
                data-calendar-day
                ${date && hasData(date) ? "has-data" : ""}
                ${date && isDataGap(date) ? "data-gap" : ""}
              `}
              disabled={!date}
              title={
                date
                  ? hasData(date)
                    ? "Dataa lisätty"
                    : isDataGap(date)
                    ? "Aukko datassa"
                    : "Ei dataa"
                  : ""
              }
            >
              {date ? date.getDate() : ""}
            </button>
          ))}
        </div>

        <div className="data-calendar-legend">
          <span>
            <i className="legend-dot has-data"></i>
            Dataa
          </span>

          <span>
            <i className="legend-dot data-gap"></i>
            Aukko
          </span>
        </div>
      </div>
    </div>
  );
}

export default DataFilter;