import {
  Fragment,
} from "react";
import "./hourMain.css";
import WaitingState from "../ui_features/waitingState.jsx";
import Loading from "../ui_features/loading.jsx";
import {
  useHourData,
} from "./hourData";
import HourStat from "./hourStat.jsx";

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

function toDate(value) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function startOfDay(value) {
  const date =
    toDate(value);

  if (!date) return null;

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function addDays(
  value,
  days
) {
  const date =
    startOfDay(value);

  if (!date) return null;

  date.setDate(
    date.getDate() + days
  );

  return date;
}

function formatDay(value) {
  const date =
    toDate(value);

  if (!date) return "";

  return date.toLocaleDateString(
    "fi-FI",
    {
      weekday: "short",
      day: "numeric",
      month: "numeric",
    }
  );
}

function formatDisplayDate(
  value
) {
  const date =
    toDate(value);

  if (!date) return "";

  return date.toLocaleDateString(
    "fi-FI",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

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


  if (ratio === 0) {
    return "#eaf3ff"; // vaaleansininen
  }
  
  if (ratio < 0.25) {
    return "#86bf91"; // hillitty vihreä
  }

  if (ratio < 0.5) {
    return "#facc15"; // keltainen
  }

  if (ratio < 0.75) {
    return "#fb923c"; // oranssi
  }

  return "#ef4444"; // punainen
}
function getRowTimestamp(
  item
) {
  return (
    item.hour_timestamp ||
    item.timestamp ||
    item.datetime ||
    item.date ||
    item.hour
  );
}

function getHourFromTimestamp(
  value
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const timestampMatch =
    value.match(
      /T(\d{1,2}):/
    );

  if (
    timestampMatch
  ) {
    return Number(
      timestampMatch[1]
    );
  }

  const timeMatch =
    value.match(
      /^(\d{1,2}):\d{2}/
    );

  if (timeMatch) {
    return Number(
      timeMatch[1]
    );
  }

  return null;
}

function getHourLabel(
  item
) {
  if (
    typeof item.hour ===
      "number" &&
    Number.isFinite(
      item.hour
    )
  ) {
    return `${String(
      item.hour
    ).padStart(
      2,
      "0"
    )}:00`;
  }

  if (
    typeof item.hour ===
      "string" &&
    /^\d{1,2}$/.test(
      item.hour
    )
  ) {
    return `${item.hour.padStart(
      2,
      "0"
    )}:00`;
  }

  if (
    typeof item.hour ===
      "string" &&
    /^\d{1,2}:\d{2}$/.test(
      item.hour
    )
  ) {
    return item.hour.padStart(
      5,
      "0"
    );
  }

  const rawTimestamp =
    item.hour_timestamp ||
    item.timestamp ||
    item.datetime ||
    item.date;

  const rawHour =
    getHourFromTimestamp(
      rawTimestamp
    );

  if (
    rawHour !== null &&
    Number.isFinite(rawHour)
  ) {
    return `${String(
      rawHour
    ).padStart(
      2,
      "0"
    )}:00`;
  }

  return "";
}

function getDateKey(item) {
  const rawTimestamp =
    getRowTimestamp(item);

  if (
    typeof rawTimestamp ===
    "string"
  ) {
    const match =
      rawTimestamp.match(
        /^(\d{4}-\d{2}-\d{2})/
      );

    if (match) {
      return match[1];
    }
  }

  const timestamp =
    toDate(rawTimestamp);

  if (!timestamp) {
    return null;
  }

  return [
    timestamp.getFullYear(),
    String(
      timestamp.getMonth() +
        1
    ).padStart(2, "0"),
    String(
      timestamp.getDate()
    ).padStart(2, "0"),
  ].join("-");
}

function getItemValue(
  item,
  valueKey
) {
  const value = Number(
    item[valueKey] ??
      item.samples_taken ??
      item.total_samples ??
      item.prediction ??
      item.value ??
      0
  );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}

function buildRows(
  data,
  valueKey
) {
  const grouped = {};

  data.forEach((item) => {
    const dateKey =
      getDateKey(item);

    if (!dateKey) return;

    const hourLabel =
      getHourLabel(item);

    if (
      !HOURS.includes(
        hourLabel
      )
    ) {
      return;
    }

    if (!grouped[dateKey]) {
      const date =
        new Date(
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
      HOURS.indexOf(
        hourLabel
      );

    const value =
      getItemValue(
        item,
        valueKey
      );

    grouped[
      dateKey
    ].values[hourIndex] =
      (
        grouped[
          dateKey
        ].values[
          hourIndex
        ] ?? 0
      ) + value;
  });

  return Object.values(
    grouped
  ).sort(
    (
      first,
      second
    ) =>
      first.date.localeCompare(
        second.date
      )
  );
}

function WaitingView() {
  return (
    <main className="hour-content">
      <WaitingState />
    </main>
  );
}

function LoadingView() {
  return (
    <main className="hour-content">
      <Loading />
    </main>
  );
}

function HourMain({
  filters,
}) {
  const safeFilters =
    filters || {
      hasApplied: false,
      mode: "realized",
      selectedLocation: "",
      forecastRange:
        "24 tuntia",
      dateRange: {
        startDate: null,
        endDate: null,
        endDateExclusive:
          null,
      },
    };

  const isForecast =
    safeFilters.mode ===
    "forecast";

  const selectedLocation =
    safeFilters.selectedLocation;

  const {
    data: hourData,
    loading,
    error,
  } = useHourData(
    safeFilters
  );

  const today =
    startOfDay(
      new Date()
    );

  const forecastDays =
    FORECAST_DAYS[
      safeFilters
        .forecastRange
    ] || 1;

  const startDate =
    isForecast
      ? today
      : startOfDay(
          safeFilters
            .dateRange
            ?.startDate
        );

  const endDateExclusive =
    isForecast
      ? addDays(
          today,
          forecastDays
        )
      : startOfDay(
          safeFilters
            .dateRange
            ?.endDateExclusive
        ) ||
        addDays(
          safeFilters
            .dateRange
            ?.endDate,
          1
        );

  const filteredData =
    hourData.filter(
      (item) => {
        const rawTimestamp =
          getRowTimestamp(
            item
          );

        const itemDate =
          startOfDay(
            rawTimestamp
          );

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

        if (
          !locationMatches
        ) {
          return false;
        }

        const dataTypeMatches =
          isForecast
            ? item.dataType ===
              "forecast"
            : item.dataType ===
              "realized";

        if (
          !dataTypeMatches
        ) {
          return false;
        }

        if (
          !startDate ||
          !endDateExclusive
        ) {
          return true;
        }

        return (
          itemDate >=
            startDate &&
          itemDate <
            endDateExclusive
        );
      }
    );

  const valueKey =
    isForecast
      ? "forecast"
      : "realized";

  const rows =
    buildRows(
      filteredData,
      valueKey
    );

  const heatmapValues =
    rows.flatMap(
      (row) =>
        row.values.filter(
          (value) =>
            value !== null &&
            value !==
              undefined
        )
    );

  const maxValue =
    heatmapValues.length >
    0
      ? Math.max(
          ...heatmapValues
        )
      : 0;

  const displayEndDate =
    endDateExclusive
      ? addDays(
          endDateExclusive,
          -1
        )
      : null;

  if (!safeFilters.hasApplied) {
    return <WaitingView />;
  }

  if (loading) {
    return <LoadingView />;
  }

  return (
    <main className="hour-content">
      <div className="hour-main-header">
        <div className="hour-header">
          <h2 className="hour-title">
            {isForecast
              ? "Ennuste tunneittain"
              : "Näytteenotot tunneittain"}
          </h2>

          <div className="hour-header-meta">
            <span className="hour-location">
              {selectedLocation || "Kaikki toimipisteet"}
            </span>

            {startDate && displayEndDate && (
              <>
                <span className="hour-meta-divider">•</span>

                <span className="hour-date-range">
                  {formatDisplayDate(startDate)}
                  {" – "}
                  {formatDisplayDate(displayEndDate)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {(
        <div className="hour-layout">
          <section className="heatmap-card">
            {error ? (
              <div className="heatmap-error">
                {error}
              </div>
            ) : rows.length ===
              0 ? (
              <div className="heatmap-error">
                Valituilla
                suodattimilla ei
                löytynyt dataa.
              </div>
            ) : (
              <div className="hour-heatmap-scroll">
                <div className="hour-heatmap-grid">
                  <div className="hour-corner" />

                  {HOURS.map(
                    (hour) => (
                      <div
                        key={hour}
                        className="hour-header-cell"
                      >
                        {hour}
                      </div>
                    )
                  )}

                  {rows.map(
                    (row) => (
                      <Fragment
                        key={
                          row.date
                        }
                      >
                        <div className="hour-day-cell">
                          {
                            row.day
                          }
                        </div>

                        {row.values.map(
                          (
                            value,
                            index
                          ) => {
                            const ratio =
                              maxValue >
                              0
                                ? Number(
                                    value ||
                                      0
                                  ) /
                                  maxValue
                                : 0;

                            return (
                              <div
                                key={`${row.date}-${HOURS[index]}`}
                                className="hour-value-cell"
                                style={{
                                  backgroundColor:
                                    getHeatColor(
                                      value,
                                      maxValue
                                    ),
                                  color:
                                    ratio >
                                    0.75
                                      ? "#ffffff"
                                      : "#111827",
                                }}
                                title={`${row.day} ${HOURS[index]}: ${
                                  value ??
                                  0
                                }`}
                              >
                                {value ??
                                  ""}
                              </div>
                            );
                          }
                        )}
                      </Fragment>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="hour-stat-column">
            <HourStat
              data={
                filteredData
              }
              valueKey={
                valueKey
              }
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default HourMain;