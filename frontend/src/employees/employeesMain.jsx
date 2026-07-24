import { Fragment } from "react";
import "./employeesMain.css";
import WaitingState from "../waitingState.jsx";
import { useEmployeesData } from "./employeesData.jsx";
import EmployeesStat from "./employeesStat.jsx";

const HOURS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
];

const FORECAST_DAYS = {
  "24 tuntia": 1,
  "2 päivää": 2,
  "3 päivää": 3,
  Viikko: 7,
  "2 viikkoa": 14,
  "3 viikkoa": 21,
  Kuukausi: 30,
};

// Muuntaa arvon Date-olioksi.
function toDate(value) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

// Palauttaa päivämäärän vuorokauden alusta.
function startOfDay(value) {
  const date = toDate(value);

  if (!date) return null;

  date.setHours(0, 0, 0, 0);

  return date;
}

// Lisää päivämäärään annetun määrän päiviä.
function addDays(value, days) {
  const date = startOfDay(value);

  if (!date) return null;

  date.setDate(date.getDate() + days);

  return date;
}

// Muotoilee päivämäärän heatmapin päiväriville.
function formatDay(value) {
  const date = toDate(value);

  if (!date) return "";

  return date.toLocaleDateString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

// Muotoilee päivämäärän otsikossa näytettäväksi.
function formatDisplayDate(value) {
  const date = toDate(value);

  if (!date) return "";

  return date.toLocaleDateString("fi-FI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Muodostaa henkilöstömäärän perusteella heatmapin värin.
function getHeatColor(
  value,
  maxValue
) {
  if (
    value === null ||
    value === undefined ||
    maxValue <= 0
  ) {
    return "#f8fafc";
  }

  const ratio = Math.min(
    Math.max(
      Number(value) / maxValue,
      0
    ),
    1
  );

  // Korostaa hieman myös keskisuuria arvoja.
  const intensity = Math.pow(
    ratio,
    0.8
  );

  const start = {
    r: 248,
    g: 250,
    b: 252,
  };

  const end = {
    r: 29,
    g: 78,
    b: 216,
  };

  const r = Math.round(
    start.r +
      (end.r - start.r) *
        intensity
  );

  const g = Math.round(
    start.g +
      (end.g - start.g) *
        intensity
  );

  const b = Math.round(
    start.b +
      (end.b - start.b) *
        intensity
  );

  return `rgb(${r}, ${g}, ${b})`;
}

// Palauttaa datarivin aikaleiman ilman pelkkää tuntiarvoa.
function getRowTimestamp(item) {
  return (
    item.hour_timestamp ||
    item.timestamp ||
    item.datetime ||
    item.date_time ||
    item.date ||
    null
  );
}

// Lukee tunnin merkkijonomuotoisesta aikaleimasta.
function getHourFromTimestamp(value) {
  if (typeof value !== "string") {
    return null;
  }

  const timestampMatch = value.match(
    /T(\d{1,2}):/
  );

  if (timestampMatch) {
    return Number(timestampMatch[1]);
  }

  const timeMatch = value.match(
    /^(\d{1,2}):\d{2}/
  );

  if (timeMatch) {
    return Number(timeMatch[1]);
  }

  return null;
}

// Muodostaa datarivin tunnista HH:00-arvon.
function getHourLabel(item) {
  if (
    typeof item.hour === "number" &&
    Number.isFinite(item.hour)
  ) {
    return `${String(item.hour).padStart(
      2,
      "0"
    )}:00`;
  }

  if (
    typeof item.hour === "string" &&
    /^\d{1,2}$/.test(item.hour)
  ) {
    return `${item.hour.padStart(
      2,
      "0"
    )}:00`;
  }

  if (
    typeof item.hour === "string" &&
    /^\d{1,2}:\d{2}$/.test(item.hour)
  ) {
    return item.hour.padStart(5, "0");
  }

  const rawTimestamp =
    item.hour_timestamp ||
    item.timestamp ||
    item.datetime ||
    item.date;

  const rawHour =
    getHourFromTimestamp(rawTimestamp);

  if (
    rawHour !== null &&
    Number.isFinite(rawHour)
  ) {
    return `${String(rawHour).padStart(
      2,
      "0"
    )}:00`;
  }

  return "";
}

// Muodostaa datariville YYYY-MM-DD-päiväavaimen.
function getDateKey(item) {
  const rawTimestamp =
    getRowTimestamp(item);

  if (typeof rawTimestamp === "string") {
    const match = rawTimestamp.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

    if (match) {
      return match[1];
    }
  }

  const timestamp = toDate(rawTimestamp);

  if (!timestamp) {
    return null;
  }

  return [
    timestamp.getFullYear(),
    String(
      timestamp.getMonth() + 1
    ).padStart(2, "0"),
    String(timestamp.getDate()).padStart(
      2,
      "0"
    ),
  ].join("-");
}

// Palauttaa toteutuneen työntekijämäärän datariviltä.
function getRealizedEmployees(item) {
  const value = Number(
    item.realizedEmployees ??
      item.realized_employees ??
      item.employees_used ??
      item.employeesUsed ??
      item.employees_used__sum ??
      item.total_employees ??
      item.totalEmployees ??
      item.employee_count ??
      item.employeeCount ??
      item.employeeValue ??
      item.employees ??
      0
  );

  return Number.isFinite(value) ? value : 0;
}

// Palauttaa ennustetun näytemäärän datariviltä.
function getForecastSamples(item) {
  const value = Number(
    item.forecast ??
      item.prediction ??
      item.predicted_samples ??
      item.samples_taken ??
      item.total_samples ??
      item.value ??
      0
  );

  return Number.isFinite(value)
    ? value
    : 0;
}

// Laskee näytemäärästä tarvittavan työntekijämäärän.
function calculateRequiredEmployees(
  predictedSamples,
  samplesPerEmployee
) {
  const capacity = Number(
    samplesPerEmployee
  );

  if (
    !Number.isFinite(capacity) ||
    capacity <= 0
  ) {
    return 0;
  }

  if (
    !Number.isFinite(predictedSamples) ||
    predictedSamples <= 0
  ) {
    return 0;
  }

  return Math.ceil(
    predictedSamples / capacity
  );
}

// Palauttaa toteutuneen tai ennustetun henkilöstömäärän.
function getEmployeeValue(
  item,
  isForecast,
  samplesPerEmployee
) {
  if (!isForecast) {
    return getRealizedEmployees(item);
  }

  const existingValue = Number(
    item.requiredEmployees ??
      item.required_employees ??
      item.forecastEmployees ??
      item.forecast_employees
  );

  if (Number.isFinite(existingValue)) {
    return existingValue;
  }

  const predictedSamples =
    getForecastSamples(item);

  return calculateRequiredEmployees(
    predictedSamples,
    samplesPerEmployee
  );
}


// Tarkistaa, onko datarivi ennusterivi.
function isForecastRow(item) {
  return (
    item.dataType === "forecast" ||
    item.type === "forecast" ||
    item.isForecast === true
  );
}

// Ryhmittelee henkilöstödatan päivittäin ja tunneittain.
function buildRows(
  data,
  isForecast,
  samplesPerEmployee
) {
  const grouped = {};

  data.forEach((item) => {
    const dateKey = getDateKey(item);

    if (!dateKey) return;

    const hourLabel =
      getHourLabel(item);

    if (!HOURS.includes(hourLabel)) {
      return;
    }

    if (!grouped[dateKey]) {
      const date = new Date(
        `${dateKey}T12:00:00`
      );

      grouped[dateKey] = {
        date: dateKey,
        timestamp: date,
        day: formatDay(date),
        values: Array(
          HOURS.length
        ).fill(null),
      };
    }

    const hourIndex =
      HOURS.indexOf(hourLabel);

    const value = getEmployeeValue(
      item,
      isForecast,
      samplesPerEmployee
    );

    const currentValue =
      grouped[dateKey]
        .values[hourIndex];

    grouped[dateKey]
      .values[hourIndex] =
      currentValue === null
        ? value
        : Math.max(
            currentValue,
            value
          );
  });

  return Object.values(grouped).sort(
    (first, second) =>
      first.date.localeCompare(
        second.date
      )
  );
}

// Lisää laskettu henkilöstömäärä tilastoja varten.
function addEmployeeValues(
  data,
  isForecast,
  samplesPerEmployee
) {
  return data.map((item) => ({
    ...item,
    employeeValue:
      getEmployeeValue(
        item,
        isForecast,
        samplesPerEmployee
      ),
  }));
}

// Näyttää tuntikohtaisen henkilöstömäärän heatmapina.
function EmployeesMain({ filters }) {
  const safeFilters =
    filters || {
      hasApplied: false,
      mode: "realized",
      selectedLocation: "",
      forecastRange:
        "24 tuntia",
      samplesPerEmployee: 10,
      dateRange: {
        startDate: null,
        endDate: null,
        endDateExclusive: null,
      },
    };

  const isForecast =
    safeFilters.mode === "forecast";

  const selectedLocation =
    safeFilters.selectedLocation;

  const samplesPerEmployee = Number(
    safeFilters.samplesPerEmployee ??
      safeFilters
        .samplesPerEmployeePerHour ??
      safeFilters.capacity ??
      10
  );

  const {
    data: employeesData,
    loading,
    error,
  } = useEmployeesData(safeFilters);

  const today = startOfDay(
    new Date()
  );

  const forecastDays =
    FORECAST_DAYS[
      safeFilters.forecastRange
    ] || 1;

  const startDate =
    isForecast
      ? today
      : startOfDay(
          safeFilters.dateRange
            ?.startDate
        );

  const endDateExclusive =
    isForecast
      ? addDays(
          today,
          forecastDays
        )
      : startOfDay(
          safeFilters.dateRange
            ?.endDateExclusive
        ) ||
        addDays(
          safeFilters.dateRange
            ?.endDate,
          1
        );

  const filteredData =
    employeesData.filter((item) => {
      const rawTimestamp =
        getRowTimestamp(item);

      const itemDate =
        startOfDay(rawTimestamp);

      if (!itemDate) {
        return false;
      }

      const locationMatches =
        !selectedLocation ||
        selectedLocation ===
          "Kaikki toimipisteet" ||
        selectedLocation ===
          "Kaikki näytteenotot" ||
        item.location ===
          selectedLocation;

      if (!locationMatches) {
        return false;
      }

      const dataTypeMatches = isForecast
        ? isForecastRow(item)
        : !isForecastRow(item);

      if (!dataTypeMatches) {
        return false;
      }

      if (
        !startDate ||
        !endDateExclusive
      ) {
        return true;
      }

      return (
        itemDate >= startDate &&
        itemDate <
          endDateExclusive
      );
    });

  const rows = buildRows(
    filteredData,
    isForecast,
    samplesPerEmployee
  );

  const employeeData =
    addEmployeeValues(
      filteredData,
      isForecast,
      samplesPerEmployee
    );

  const heatmapValues =
    rows.flatMap((row) =>
      row.values.filter(
        (value) =>
          value !== null &&
          value !== undefined
      )
    );

  const maxValue =
    heatmapValues.length > 0
      ? Math.max(...heatmapValues)
      : 0;

  const displayEndDate =
    endDateExclusive
      ? addDays(
          endDateExclusive,
          -1
        )
      : null;

  if (!safeFilters.hasApplied) {
    return (
      <main className="employees-content">
        <WaitingState />
      </main>
    );
  }

  return (
    <main className="employees-content">
<div className="employees-heatmap-header">
  <div className="employees-header">
    <h2 className="employees-title">
      {isForecast
        ? "Ennustettu henkilöstötarve"
        : "Toteutunut henkilöstömäärä"}
    </h2>

    <div className="employees-header-meta">
      <span className="employees-location">
        {selectedLocation || "Kaikki toimipisteet"}
      </span>

      {startDate && displayEndDate && (
        <>
          <span className="employees-meta-divider">•</span>

          <span className="employees-date-range">
            {formatDisplayDate(startDate)}
            {" – "}
            {formatDisplayDate(displayEndDate)}
          </span>
        </>
      )}
    </div>
  </div>

  {isForecast && (
    <div className="employees-capacity-text">
      {/* kapasiteettiteksti */}
    </div>
  )}
</div>

      {loading ? (
        <WaitingState />
      ) : (
        <div className="employees-layout">
          <section className="employees-heatmap-card">
            {error ? (
              <div className="employees-error">
                {error}
              </div>
            ) : rows.length === 0 ? (
              <div className="employees-error">
                Valituilla
                suodattimilla ei
                löytynyt
                henkilöstödataa.
              </div>
            ) : (
              <div className="employees-heatmap-scroll">
                <div className="employees-heatmap-grid">
                  <div className="employees-corner" />

                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="employees-header-cell"
                    >
                      {hour}
                    </div>
                  ))}

                  {rows.map((row) => (
                    <Fragment
                      key={row.date}
                    >
                      <div className="employees-day-cell">
                        {row.day}
                      </div>

                      {row.values.map(
                        (
                          value,
                          index
                        ) => {
                          const ratio =
                            maxValue > 0
                              ? Number(
                                  value ||
                                    0
                                ) /
                                maxValue
                              : 0;

                          return (
                            <div
                              key={`${row.date}-${HOURS[index]}`}
                              className="employees-value-cell"
                              style={{
                                backgroundColor:
                                  getHeatColor(
                                    value,
                                    maxValue
                                  ),
                                color:
                                  ratio > 0.65
                                    ? "#ffffff"
                                    : "#111827",
                              }}
                              title={`${row.day} ${HOURS[index]}: ${
                                value ?? 0
                              } työntekijää`}
                            >
                              {value ?? ""}
                            </div>
                          );
                        }
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="employees-stat-column">
            <EmployeesStat
              data={employeeData}
              valueKey="employeeValue"
              isForecast={
                isForecast
              }
              samplesPerEmployee={
                samplesPerEmployee
              }
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default EmployeesMain;