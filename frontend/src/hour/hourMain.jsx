import { Fragment } from "react";
import "./hourMain.css";
import WaitingState from "../waitingState.jsx";
import hourData from "./hourData";

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

function formatDay(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

function getForecastDays(range) {
  if (range === "1 viikko") return 7;
  if (range === "2 viikkoa") return 14;
  if (range === "1 kuukausi") return 30;
  if (range === "2 kuukautta") return 60;
  return 7;
}

function getHeatColor(value) {
  if (value === null || value === undefined) return "#f8f8f8";
  if (value >= 190) return "#7f0026";
  if (value >= 170) return "#b6002e";
  if (value >= 150) return "#dc2626";
  if (value >= 130) return "#f97316";
  if (value >= 110) return "#fb923c";
  if (value >= 90) return "#facc15";
  if (value >= 70) return "#fde68a";
  if (value >= 50) return "#fef3c7";
  return "#fffbea";
}

function getTextColor(value) {
  return value >= 130 ? "#ffffff" : "#111111";
}

function getVisibleEndDate(startDate, endDate) {
  if (!startDate) return endDate;

  const maxEndDate = addDays(startDate, 6);

  if (!endDate || endDate > maxEndDate) {
    return maxEndDate;
  }

  return endDate;
}

function buildRows(data, valueKey) {
  const grouped = {};

  data.forEach((item) => {
    const itemHour = item.hour.slice(11, 16);

    if (!hours.includes(itemHour)) return;

    const key = item.date;

    if (!grouped[key]) {
      grouped[key] = {
        date: item.date,
        day: formatDay(item.date),
        values: Array(hours.length).fill(null),
      };
    }

    const hourIndex = hours.indexOf(itemHour);

    grouped[key].values[hourIndex] =
      (grouped[key].values[hourIndex] || 0) + item[valueKey];
  });

  return Object.values(grouped).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

function HourMain({ filters }) {
  const safeFilters = filters || {
    mode: "realized",
    selectedLocation: "",
    forecastRange: "24 tuntia",
    dateRange: {
      startDate: null,
      endDate: null,
    },
  };

function formatDisplayDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("fi-FI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

  const isForecast = safeFilters.mode === "forecast";

  const startDate = normalizeDate(safeFilters.dateRange?.startDate);
  const selectedEndDate = normalizeDate(safeFilters.dateRange?.endDate);
  const endDate = getVisibleEndDate(startDate, selectedEndDate);

  const isWaitingForFilters =
    !isForecast &&
    !safeFilters.selectedLocation &&
    !startDate &&
    !endDate;

  const selectedLocation = safeFilters.selectedLocation;

  const firstDataDate = hourData[0]?.date;
  const forecastEndDate = firstDataDate
    ? addDays(firstDataDate, getForecastDays(safeFilters.forecastRange) - 1)
    : null;

  const filteredData = hourData.filter((item) => {
    const locationMatches =
      !selectedLocation ||
      selectedLocation === "Kaikki toimipisteet" ||
      item.location === selectedLocation;

    if (!locationMatches) return false;

    if (isForecast) {
      return item.date >= firstDataDate && item.date <= forecastEndDate;
    }

    return (
      (!startDate || item.date >= startDate) &&
      (!endDate || item.date <= endDate)
    );
  });

  const rows = buildRows(
    filteredData,
    isForecast ? "forecast" : "realized"
  );

  return (
    <main className="hour-content">
      {isWaitingForFilters ? (
        <WaitingState />
      ) : (
        <>
          <div className="heatmap-header">
            <div className="heatmap-selected-locations">
              {!selectedLocation
                ? "Kaikki toimipisteet"
                : selectedLocation}
            </div>

            <h3 className="heatmap-title">
              {isForecast
                ? "Ennuste tunneittain"
                : "Näytteenotot tunneittain"}

              {isForecast && (
                <span className="heatmap-date-range">
                  {safeFilters.forecastRange}
                </span>
              )}

              {!isForecast && startDate && (
                <span className="heatmap-date-range">
                  {endDate
                    ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`
                    : formatDisplayDate(startDate)}
                </span>
              )}
            </h3>
          </div>

          <section className="heatmap-card">
            {rows.length === 0 ? (
              <div className="heatmap-error">
                Valituilla suodattimilla ei löytynyt dataa.
              </div>
            ) : (
              <div className="hour-heatmap-scroll">
                <div className="hour-heatmap-grid">
                  <div className="hour-corner" />

                  {hours.map((hour) => (
                    <div key={hour} className="hour-header-cell">
                      {hour}
                    </div>
                  ))}

                  {rows.map((row) => (
                    <Fragment key={row.date}>
                      <div className="hour-day-cell">
                        {row.day}
                      </div>

                      {row.values.map((value, index) => (
                        <div
                          key={`${row.date}-${hours[index]}`}
                          className="hour-value-cell"
                          style={{
                            backgroundColor: getHeatColor(value),
                            color: getTextColor(value),
                          }}
                          title={`${row.day} ${hours[index]}: ${
                            value ?? 0
                          }`}
                        >
                          {value ?? ""}
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default HourMain;