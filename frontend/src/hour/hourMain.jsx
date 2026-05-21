import { Fragment } from "react";
import "./hourMain.css";
import WaitingState from "../waitingState.jsx";

const realizedRows = [
  {
    location: "Lab1",
    day: "Ma 20.10.",
    date: "2025-10-20",
    values: [20, 44, 26, 18, 4, 2, 2, null],
  },
  {
    location: "Lab1",
    day: "Ti 21.10.",
    date: "2025-10-21",
    values: [10, 22, 22, 28, 4, null, null, 2],
  },
  {
    location: "Lab1",
    day: "Ke 22.10.",
    date: "2025-10-22",
    values: [14, 26, 30, 34, 6, 2, null, null],
  },
  {
    location: "Lab2",
    day: "Ma 20.10.",
    date: "2025-10-20",
    values: [8, 14, 20, 16, 4, null, null, null],
  },
  {
    location: "Lab3",
    day: "Ke 22.10.",
    date: "2025-10-22",
    values: [6, 10, 14, 12, 2, null, null, null],
  },
];

const forecastRows = [
  {
    location: "Lab1",
    forecastRange: "2 viikkoa",
    day: "Ma 27.10.",
    date: "2025-10-27",
    values: [18, 38, 30, 22, 6, 2, null, null],
  },
  {
    location: "Lab1",
    forecastRange: "2 viikkoa",
    day: "Ti 28.10.",
    date: "2025-10-28",
    values: [16, 34, 28, 24, 8, 2, null, null],
  },
  {
    location: "Lab2",
    forecastRange: "2 viikkoa",
    day: "Ma 27.10.",
    date: "2025-10-27",
    values: [10, 20, 24, 18, 6, 2, null, null],
  },
  {
    location: "Lab3",
    forecastRange: "Kuukausi",
    day: "Ma 17.11.",
    date: "2025-11-17",
    values: [8, 16, 20, 18, 4, null, null, null],
  },
];

const hours = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
];

function getHeatColor(value) {
  if (value === null || value === undefined) return "#fffdd1";
  if (value >= 40) return "#97002d";
  if (value >= 34) return "#d90f1f";
  if (value >= 30) return "#ef261f";
  if (value >= 26) return "#ff5631";
  if (value >= 20) return "#ff8a35";
  if (value >= 14) return "#ffc35b";
  if (value >= 8) return "#ffe083";
  if (value >= 4) return "#fff0a6";

  return "#fff7bd";
}

function normalizeDate(date) {
  if (!date) return null;
  if (typeof date === "string") return date.slice(0, 10);

  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function getVisibleEndDate(startDate, endDate) {
  if (!startDate) return endDate;

  const maxEndDate = addDays(startDate, 6);

  if (!endDate || endDate > maxEndDate) {
    return maxEndDate;
  }

  return endDate;
}

function HourMain({ filters }) {
  const isForecast = filters.mode === "forecast";

  const isWaitingForFilters =
    !filters.selectedLocation &&
    !filters.dateRange.startDate &&
    !filters.dateRange.endDate &&
    filters.mode === "realized";

  const selectedLocations =
    !filters.selectedLocation ||
    filters.selectedLocation === "Kaikki toimipisteet"
      ? ["Lab1", "Lab2", "Lab3"]
      : [filters.selectedLocation];

  const startDate = normalizeDate(filters.dateRange.startDate);
  const selectedEndDate = normalizeDate(filters.dateRange.endDate);
  const endDate = getVisibleEndDate(startDate, selectedEndDate);

  const sourceRows = isForecast ? forecastRows : realizedRows;

  const filteredRows = sourceRows.filter((row) => {
    const locationMatches = selectedLocations.includes(row.location);

    const dateMatches = isForecast
      ? row.forecastRange === filters.forecastRange
      : (!startDate || row.date >= startDate) &&
        (!endDate || row.date <= endDate);

    return locationMatches && dateMatches;
  });

  return (
    <main className="hour-content">
      {isWaitingForFilters ? (
        <WaitingState />
      ) : (
        <>
          <div className="heatmap-header">
            <div className="heatmap-selected-locations">
              {!filters.selectedLocation
                ? "Kaikki toimipisteet"
                : filters.selectedLocation}
            </div>

            <h2 className="heatmap-title">
              {isForecast
                ? `Ennuste tunneittain: ${filters.forecastRange}`
                : "Näytteenotot tunneittain"}
            </h2>
          </div>

          <section className="heatmap-card">
            {filteredRows.length === 0 ? (
              <div className="heatmap-error">
                Valituilla suodattimilla ei löytynyt dataa.
              </div>
            ) : (
              <div className="heatmap-grid">
                <div />

                {hours.map((hour) => (
                  <div key={hour} className="heatmap-hour">
                    {hour}
                  </div>
                ))}

                {filteredRows.map((row) => (
                  <Fragment key={`${row.location}-${row.date}`}>
                    <div className="heatmap-day">{row.day}</div>

                    {row.values.map((value, index) => (
                      <div
                        key={`${row.location}-${row.date}-${hours[index]}`}
                        className="heatmap-cell"
                        style={{
                          background: getHeatColor(value),
                          color: value >= 26 ? "#ffffff" : "#111111",
                        }}
                        title={`${row.location} ${row.day} ${hours[index]}: ${
                          value ?? 0
                        }`}
                      >
                        {value ?? ""}
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default HourMain;