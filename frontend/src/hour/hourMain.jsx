import { Fragment } from "react";
import "./hourMain.css";
import WaitingState from "../waitingState.jsx";
import { useHourData } from "./hourData";
import HourStat from "./hourStat.jsx";

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

function toDate(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function startOfDay(value) {
  const date = toDate(value);
  if (!date) return null;

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(value, days) {
  const date = startOfDay(value);
  if (!date) return null;

  date.setDate(date.getDate() + days);
  return date;
}

function toDateKey(value) {
  const date = startOfDay(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDay(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

function formatDisplayDate(value) {
  if (!value) return "";

  const date = toDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("fi-FI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// kun valitaan esim. viikko, palautetaan 7 päivän tiedot
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

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

function HourMain({ filters }) {
  // oletusarvojen varmistus, jotta ei kaadu vaikkei filtersejä olisi vielä valittu
  const safeFilters = filters || {
    mode: "realized",
    selectedLocation: "",
    forecastRange: "24 tuntia",
    dateRange: {
      startDate: null,
      endDate: null,
      endDateExclusive: null,
    },
  };

  const isForecast = safeFilters.mode === "forecast";

  const selectedLocation = safeFilters.selectedLocation;

  const hourData = useHourData(safeFilters);

  // data aikajärjestykseen heatmapin rivejä varten
  const sortedData = [...hourData].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const today = startOfDay(new Date());

  const forecastStartDate = today;

  const forecastEndDateExclusive = addDays(
    forecastStartDate,
    getForecastDays(safeFilters.forecastRange)
  );

  const startDate = isForecast
    ? forecastStartDate
    : startOfDay(safeFilters.dateRange?.startDate);

  const endDateExclusive = isForecast
    ? forecastEndDateExclusive
    : startOfDay(
        safeFilters.dateRange?.endDateExclusive ||
          addDays(safeFilters.dateRange?.endDate, 1)
      );

  const isWaitingForFilters =
    !isForecast && !selectedLocation && !startDate && !endDateExclusive;

  const filteredData = sortedData.filter((item) => {
    const itemDate = startOfDay(item.date);

    const locationMatches =
      !selectedLocation ||
      selectedLocation === "Kaikki toimipisteet" ||
      item.location === selectedLocation;

    if (!locationMatches) return false;

    if (!startDate || !endDateExclusive) return true;

    return itemDate >= startDate && itemDate < endDateExclusive;
  });

  const rows = buildRows(filteredData, isForecast ? "forecast" : "realized");

  const displayStartDate = startDate;
  const displayEndDate = isForecast
    ? addDays(endDateExclusive, -1)
    : startOfDay(safeFilters.dateRange?.endDate);

  return (
    <main className="hour-content">
      {isWaitingForFilters ? (
        <WaitingState />
      ) : (
        <>
          <div className="heatmap-header">
            <div className="heatmap-selected-locations">
              {!selectedLocation ? "Kaikki toimipisteet" : selectedLocation}
            </div>

            <h3 className="heatmap-title">
              {isForecast ? "Ennuste tunneittain" : "Näytteenotot tunneittain"}

              {isForecast && (
                <span className="heatmap-date-range">
                  {safeFilters.forecastRange}
                </span>
              )}

              {!isForecast && displayStartDate && (
                <span className="heatmap-date-range">
                  {displayEndDate
                    ? `${formatDisplayDate(displayStartDate)} – ${formatDisplayDate(
                        displayEndDate
                      )}`
                    : formatDisplayDate(displayStartDate)}
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
                      <div className="hour-day-cell">{row.day}</div>

                      {row.values.map((value, index) => (
                        <div
                          key={`${row.date}-${hours[index]}`}
                          className="hour-value-cell"
                          style={{
                            backgroundColor: getHeatColor(value),
                            color: getTextColor(value),
                          }}
                          title={`${row.day} ${hours[index]}: ${value ?? 0}`}
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
          <HourStat data={filteredData} valueKey={isForecast ? "forecast" : "realized"} />
        </>
      )}
    </main>
  );
}

export default HourMain;