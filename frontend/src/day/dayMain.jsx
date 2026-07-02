import "./dayMain.css";
import WaitingState from "../waitingState.jsx";
import { useRealData } from "./dayData.jsx";
import DayStat from "./dayStat.jsx";

const COLORS = {
  "Kaikki näytteenotot": "#2563eb",
  Lab1: "#2563eb",
  Lab2: "#f97316",
  Lab3: "#16a34a",
  Lab4: "#9333ea",
  Lab5: "#dc2626",
  Lab6: "#0891b2",
};

const RANGE_DAYS = {
  "2 viikkoa": 14,
  "3 viikkoa": 21,
  Kuukausi: 30,
  "2 kuukautta": 60,
  "3 kuukautta": 90,
  "6 kuukautta": 180,
};

// päivämäärien käsittelyyn liittyvät funktio, käytetään suodatuksessa ja graafin muodostamisessa
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

function addOneDay(value) {
  const date = startOfDay(value);
  if (!date) return null;

  date.setDate(date.getDate() + 1);
  return date;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

// muuntaa backendin palauttaman datan graafin käyttämään muotoon
function normalizeBackendData(rows) {
  return rows.map((row) => ({
    id: row.id,
    date: row.date || row.timestamp?.split("T")[0],
    location: row.location,
    realized: row.realized ?? row.samples_taken ?? 0,
    forecast: row.forecast ?? row.samples_taken ?? 0,
  }));
}

// tässä viikonloput ja pyhät yms laitetaaan nollaksi, jotta näkyy graafissa
function fillMissingDates(data) {
  if (!data.length) return [];

  const sorted = [...data].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const locations = [...new Set(sorted.map((item) => item.location))];

  const start = startOfDay(sorted[0].date);
  const end = startOfDay(sorted[sorted.length - 1].date);

  const existing = new Map(
    sorted.map((item) => [`${item.date}-${item.location}`, item])
  );

  const filled = [];
  const current = new Date(start);

  while (current <= end) {
    const dateString = current.toISOString().split("T")[0];

    locations.forEach((location) => {
      const key = `${dateString}-${location}`;

      filled.push(
        existing.get(key) || {
          date: dateString,
          location,
          realized: 0,
          forecast: 0,
        }
      );
    });

    current.setDate(current.getDate() + 1);
  }

  return filled;
}

// haetaan backendistä data ja normalisoidaan se graafia varten
function DayMain({ filters }) {
  const backendData = useRealData(filters);
  const dayData = normalizeBackendData(backendData);

  if (!filters?.hasApplied) {
    return (
      <main className="day-main">
        <WaitingState />
      </main>
    );
  }

  const mode = filters.mode || "realized";

  const selectedLocations = filters.selectedLocations || [
    "Kaikki näytteenotot",
  ];

  const allSelected =
    selectedLocations.length === 0 ||
    selectedLocations.includes("Kaikki näytteenotot");

  const sourceData = fillMissingDates(dayData)
    .filter((item) => item.date && item.location)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

    // teksti "ei dataa" näkyy myös kun autentikaatiossa haasteita, eli esim ei kirjautuntut sisään
  if (sourceData.length === 0) {
    return (
      <main className="day-main">
        <div className="day-empty-state">
          Ei vielä näytettävää dataa. Lisää tiedosto ensin.
        </div> 
      </main>
    );
  }

  const today = startOfDay(new Date());

  const firstDate =
    mode === "forecast" ? today : startOfDay(sourceData[0]?.date);

  const forecastDays = RANGE_DAYS[filters.forecastRange] || 14;

  const forecastEndDate = addOneDay(firstDate);
  forecastEndDate.setDate(firstDate.getDate() + forecastDays);

  const startDate =
    mode === "forecast"
      ? firstDate
      : startOfDay(filters.dateRange?.startDate);

  const endDateExclusive =
    mode === "forecast"
      ? forecastEndDate
      : startOfDay(
          filters.dateRange?.endDateExclusive ||
            addOneDay(filters.dateRange?.endDate)
        );

  // rajataan data valitun aikavälin ja toimipisteiden mukaan
  const baseFilteredData = sourceData.filter((item) => {
    const itemDate = startOfDay(item.date);

    const locationMatches =
      allSelected || selectedLocations.includes(item.location);

    const dateMatches =
      !startDate ||
      !endDateExclusive ||
      (itemDate >= startDate && itemDate < endDateExclusive);

    return locationMatches && dateMatches;
  });

  // jos valittuna on kaikki toimipisteet, summataan eri toimipisteiden arvot päivätasolle
  const filteredData = allSelected
    ? Object.values(
        baseFilteredData.reduce((acc, item) => {
          if (!acc[item.date]) {
            acc[item.date] = {
              date: item.date,
              location: "Kaikki näytteenotot",
              realized: 0,
              forecast: 0,
            };
          }

          acc[item.date].realized += item.realized;
          acc[item.date].forecast += item.forecast;

          return acc;
        }, {})
      )
    : baseFilteredData;

  const locations = [...new Set(filteredData.map((item) => item.location))];

  const dates = [...new Set(filteredData.map((item) => item.date))].sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const valueKey = mode === "forecast" ? "forecast" : "realized";

  const maxValue = Math.max(10, ...filteredData.map((item) => item[valueKey]));
  const roundedMaxValue = Math.ceil(maxValue / 50) * 50;

  const width = 1000;
  const height = 380;
  const padding = {
    top: 28,
    right: 26,
    bottom: 46,
    left: 54,
  };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // scg-graafin laskentafunktiot: muunnetaan päivämäärät ja arvot koordinaateiksi
  const getX = (date) => {
    const index = dates.indexOf(date);

    if (dates.length <= 1) return padding.left;

    return padding.left + (index / (dates.length - 1)) * innerWidth;
  };

  const getY = (value) => {
    return padding.top + innerHeight - (value / roundedMaxValue) * innerHeight;
  };

  const getPath = (location) => {
    const points = dates
      .map((date) => {
        const item = filteredData.find(
          (entry) => entry.date === date && entry.location === location
        );

        if (!item) return null;

        return {
          x: getX(date),
          y: getY(item[valueKey]),
        };
      })
      .filter(Boolean);

    return points
      .map((point, index) =>
        index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
      )
      .join(" ");
  };

  const labelStep = Math.max(1, Math.ceil(dates.length / 10));
  const visibleDateLabels = dates.filter((_, index) => index % labelStep === 0);

  const showDots = dates.length <= 45;

  // otsikko, legenda, viivagraafi ja tilastot valitun datan perusteella
  return (
    <main className="day-main">
      <div className="day-main-header">
        <div>
          <h1>
            {mode === "realized"
              ? "Toteutuneet näytteet"
              : "Ennustetut näytteet"}
          </h1>

          <span>
            {allSelected ? "Kaikki näytteenotot" : selectedLocations.join(", ")}
          </span>
        </div>
      </div>

      <section className="day-chart-card">
        {filteredData.length === 0 ? (
          <div className="day-empty-state">
            Ei dataa valituilla suodattimilla
          </div>
        ) : (
          <>
            <div className="day-chart-top">
              <div className="day-chart-legend">
                {locations.map((location) => (
                  <span key={location} className="day-legend-item">
                    <i style={{ backgroundColor: COLORS[location] }} />
                    {location}
                  </span>
                ))}
              </div>

              <span className="day-chart-range">
                {mode === "forecast"
                  ? filters.forecastRange
                  : `${formatDate(dates[0])}–${formatDate(
                      dates[dates.length - 1]
                    )}`}
              </span>
            </div>

            <div className="day-line-chart-wrapper">
              <svg
                className="day-line-chart"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                  const value = Math.round(roundedMaxValue * step);
                  const y = getY(value);

                  return (
                    <g key={step}>
                      <line
                        x1={padding.left}
                        x2={width - padding.right}
                        y1={y}
                        y2={y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />

                      <text
                        x={padding.left - 12}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="12"
                        fill="#64748b"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {locations.map((location) => (
                  <path
                    key={location}
                    d={getPath(location)}
                    fill="none"
                    stroke={COLORS[location] || "#2563eb"}
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={mode === "forecast" ? "8 6" : "0"}
                  />
                ))}

                {showDots &&
                  filteredData.map((item, index) => (
                    <circle
                      key={`${item.date}-${item.location}-${index}`}
                      cx={getX(item.date)}
                      cy={getY(item[valueKey])}
                      r="4"
                      fill={COLORS[item.location] || "#2563eb"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    >
                      <title>
                        {item.location} {formatDate(item.date)}:{" "}
                        {item[valueKey]}
                      </title>
                    </circle>
                  ))}

                {visibleDateLabels.map((date) => (
                  <text
                    key={date}
                    x={getX(date)}
                    y={height - 14}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#64748b"
                  >
                    {formatDate(date)}
                  </text>
                ))}
              </svg>
            </div>
          </>
        )}
      </section>

      <DayStat
        data={filteredData.filter((item) => item[valueKey] > 0)}
        valueKey={valueKey}
      />
    </main>
  );
  // DayStat = tilastoista jätetään pois nollapäivät, jotta päivät ilman näytteenottoja ei vääristä keskiarvoja
}

export default DayMain;