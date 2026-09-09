import { useMemo, useState } from "react";
import "./dayMain.css";

import WaitingState from "../ui_features/waitingState.jsx";
import Loading from "../ui_features/loading.jsx";
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
  Lab7: "#ca8a04",
  Lab8: "#db2777",
  Lab9: "#4f46e5",
  Lab10: "#059669",
  Lab11: "#ea580c",
  Lab12: "#7c3aed",
  Lab13: "#0d9488",
  Lab14: "#be123c",
  Lab15: "#65a30d",
  Lab16: "#0369a1",
  Lab17: "#c026d3",
  Lab18: "#a16207",
  Lab19: "#475569",
  Lab20: "#15803d",
  Lab21: "#b91c1c",
};

const RANGE_DAYS = {
  "2 viikkoa": 14,
  "3 viikkoa": 21,
  Kuukausi: 30,
  "2 kuukautta": 60,
  "3 kuukautta": 90,
  "6 kuukautta": 180,
};

const CHART_WIDTH = 550;
const CHART_HEIGHT = 380;

const CHART_PADDING = {
  top: 28,
  right: 26,
  bottom: 46,
  left: 54,
};

// Muuntaa arvon Date-olioksi.
function toDate(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

// Palauttaa päivämäärän päivän alussa.
function startOfDay(value) {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  return normalizedDate;
}

// Palauttaa päivämäärää seuraavan päivän.
function addOneDay(value) {
  const date = startOfDay(value);

  if (!date) {
    return null;
  }

  date.setDate(date.getDate() + 1);

  return date;
}


function addDays(value, amount) {
  const date = startOfDay(value);
  if (!date) return null;
  date.setDate(date.getDate() + amount);
  return date;
}

function getDaysBetween(start, endExclusive) {
  const startDate = startOfDay(start);
  const endDate = startOfDay(endExclusive);
  if (!startDate || !endDate) return 14;

  return Math.max(
    1,
    Math.round((endDate - startDate) / (24 * 60 * 60 * 1000))
  );
}

function toDateString(value) {
  const date = startOfDay(value);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Muotoilee päivämäärän graafissa näytettävään muotoon.
function formatDate(
  dateString
) {
  if (!dateString) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = String(dateString)
    .split("T")[0]
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  return `${day}.${month}.`;
}

// Palauttaa backend-rivin ennustearvon.
function getForecastValue(row) {
  return (
    row.forecast ??
    row.prediction ??
    row.predicted_patient_count ??
    row.predicted_samples ??
    row.predicted_samples_taken ??
    row.predicted_value ??
    row.samples_prediction ??
    row.value ??
    0
  );
}

// Palauttaa backend-rivin päivämäärän.
function getRowDate(row) {
  return (
    row.date ||
    row.prediction_date ||
    row.timestamp?.split("T")[0]
  );
}

// Palauttaa backend-rivin toimipisteen.
function getRowLocation(row) {
  return (
    row.location ||
    row.location_name ||
    "Kaikki näytteenotot"
  );
}

// Muuntaa yhden backend-rivin graafin käyttämään muotoon.
function normalizeBackendRow(row, index) {
  const date = getRowDate(row);
  const location = getRowLocation(row);

  return {
    id:
      row.id ??
      `${row.location || "unknown"}-${row.date || index}`,
    date,
    location,
    realized: Number(
      row.realized ??
      row.samples_taken ??
      0
    ),
    forecast: Number(getForecastValue(row)),
    holiday: Boolean(row.holiday),
  };
}

// Muuntaa backend-datan graafin käyttämään muotoon.
function normalizeBackendData(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(normalizeBackendRow);
}

// Järjestää datan päivämäärän mukaan.
function sortDataByDate(data) {
  return [...data].sort(
    (first, second) =>
      new Date(first.date) - new Date(second.date)
  );
}

// Palauttaa datassa esiintyvät toimipisteet.
function getLocations(data) {
  return [
    ...new Set(data.map((item) => item.location)),
  ];
}

// Muodostaa päivämäärän ja toimipisteen yhdistävän avaimen.
function createDataKey(date, location) {
  return `${date}-${location}`;
}

// Muodostaa datasta nopean päivämäärä- ja toimipistehaun.
function createDataMap(data) {
  return new Map(
    data.map((item) => [
      createDataKey(item.date, item.location),
      item,
    ])
  );
}

// Muodostaa puuttuvalle päivälle nollarivin.
function createEmptyDataRow(date, location) {
  return {
    date,
    location,
    realized: 0,
    forecast: 0,
    holiday: false,
  };
}

// Palauttaa olemassa olevan rivin tai muodostaa nollarivin.
function getDataRow(existingData, date, location) {
  const key = createDataKey(date, location);

  return (
    existingData.get(key) ||
    createEmptyDataRow(date, location)
  );
}

// Lisää yhden päivän kaikkien toimipisteiden rivit tuloksiin.
function appendDateRows(
  filledData,
  existingData,
  date,
  locations
) {
  locations.forEach((location) => {
    filledData.push(
      getDataRow(existingData, date, location)
    );
  });
}

// Lisää puuttuvat kalenteripäivät dataan nolla-arvoilla.
function fillMissingDates(
  data,
  rangeStart = null,
  rangeEndExclusive = null
) {
  if (!data.length) {
    return [];
  }

  const sortedData =
    sortDataByDate(data);

  const locations =
    getLocations(sortedData);

  const dataStartDate =
    startOfDay(
      sortedData[0].date
    );

  const dataEndDateExclusive =
    addOneDay(
      sortedData[
        sortedData.length - 1
      ].date
    );

  const startDate =
    startOfDay(rangeStart) ||
    dataStartDate;

  const endDateExclusive =
    startOfDay(
      rangeEndExclusive
    ) ||
    dataEndDateExclusive;

  const existingData =
    createDataMap(sortedData);

  const filledData = [];

  const currentDate =
    new Date(startDate);

  while (
    currentDate <
    endDateExclusive
  ) {
    const dateString =
      toDateString(
        currentDate
      );

    appendDateRows(
      filledData,
      existingData,
      dateString,
      locations
    );

    currentDate.setDate(
      currentDate.getDate() + 1
    );
  }

  return filledData;
}

// Tarkistaa, sisältääkö datarivi tarvittavat perustiedot.
function isValidDataRow(item) {
  return Boolean(item.date && item.location);
}

// Valmistelee datan suodatusta varten.
function prepareSourceData(
  data,
  startDate,
  endDateExclusive
) {
  return fillMissingDates(
    data,
    startDate,
    endDateExclusive
  )
    .filter(isValidDataRow)
    .sort(
      (first, second) =>
        first.date.localeCompare(
          second.date
        )
    );
}

// Palauttaa näkymän käyttämän arvokentän.
function getValueKey(mode) {
  return mode === "forecast"
    ? "forecast"
    : "realized";
}

// Palauttaa käyttäjän valitsemat toimipisteet.
// Palauttaa käyttäjän valitsemat toimipisteet aina taulukkona.
function getSelectedLocations(filters) {
  if (Array.isArray(filters?.selectedLocations)) {
    return filters.selectedLocations;
  }

  if (filters?.selectedLocation) {
    return [filters.selectedLocation];
  }

  return ["Kaikki näytteenotot"];
}

// Tarkistaa, ovatko kaikki toimipisteet valittuina.
function areAllLocationsSelected(selectedLocations) {
  return (
    selectedLocations.length === 0 ||
    selectedLocations.includes("Kaikki näytteenotot")
  );
}

// Palauttaa valitun ennustejakson päivien määrän.
function getForecastDays(forecastRange) {
  return RANGE_DAYS[forecastRange] || 14;
}

// Laskee ennustejakson loppupäivän.
function getForecastEndDate(firstDate, forecastDays) {
  const endDate = new Date(firstDate);

  endDate.setDate(
    endDate.getDate() + forecastDays
  );

  return endDate;
}

// Palauttaa suodatuksessa käytettävän alkupäivän.
function getFilterStartDate(
  mode,
  firstDate,
  dateRange
) {
  return mode === "forecast"
    ? firstDate
    : startOfDay(dateRange?.startDate);
}

// Palauttaa suodatuksessa käytettävän loppupäivän.
function getFilterEndDate(
  mode,
  forecastEndDate,
  dateRange
) {
  if (mode === "forecast") {
    return forecastEndDate;
  }

  return startOfDay(
    dateRange?.endDateExclusive ||
    addOneDay(dateRange?.endDate)
  );
}

// Tarkistaa, vastaako datarivi toimipistesuodatusta.
function locationMatchesFilter(
  item,
  selectedLocations,
  allSelected
) {
  return (
    allSelected ||
    selectedLocations.includes(item.location)
  );
}

// Tarkistaa, vastaako datarivi päivämääräsuodatusta.
function dateMatchesFilter(
  item,
  startDate,
  endDateExclusive
) {
  const itemDate = startOfDay(item.date);

  return (
    !startDate ||
    !endDateExclusive ||
    (
      itemDate >= startDate &&
      itemDate < endDateExclusive
    )
  );
}

// Rajaa datan valittujen toimipisteiden ja päivämäärien mukaan.
function filterData(
  data,
  selectedLocations,
  allSelected,
  startDate,
  endDateExclusive
) {
  return data.filter((item) => {
    return (
      locationMatchesFilter(
        item,
        selectedLocations,
        allSelected
      ) &&
      dateMatchesFilter(
        item,
        startDate,
        endDateExclusive
      )
    );
  });
}

// Muodostaa yhden päivän yhdistetyn datarivin.
function createCombinedDataRow(date) {
  return {
    date,
    location: "Kaikki näytteenotot",
    realized: 0,
    forecast: 0,
  };
}

// Lisää datarivin arvot päivän yhdistettyyn tulokseen.
function addItemToCombinedData(accumulator, item) {
  if (!accumulator[item.date]) {
    accumulator[item.date] =
      createCombinedDataRow(item.date);
  }

  accumulator[item.date].realized += item.realized;
  accumulator[item.date].forecast += item.forecast;

  return accumulator;
}

// Yhdistää toimipisteiden arvot päivätasolle.
function combineLocationsByDate(data) {
  return Object.values(
    data.reduce(addItemToCombinedData, {})
  );
}

// Palauttaa joko yhdistetyn tai toimipistekohtaisen datan.
function getFilteredData(baseFilteredData, allSelected) {
  return allSelected
    ? combineLocationsByDate(baseFilteredData)
    : baseFilteredData;
}

// Palauttaa graafin yksilölliset päivämäärät.
function getDates(data) {
  return [
    ...new Set(data.map((item) => item.date)),
  ].sort(
    (first, second) =>
      new Date(first) - new Date(second)
  );
}

// Palauttaa tilastoihin vain positiiviset arvot.
function getStatisticsData(data, valueKey) {
  return data.filter(
    (item) => item[valueKey] > 0
  );
}

// Laskee graafin pyöristetyn enimmäisarvon.
function getRoundedMaxValue(data, valueKey) {
  const maxValue = Math.max(
    10,
    ...data.map((item) => item[valueKey])
  );

  return Math.ceil(maxValue / 50) * 50;
}

// Laskee graafin sisäisen leveyden.
function getInnerWidth(width, padding) {
  return width - padding.left - padding.right;
}

// Laskee graafin sisäisen korkeuden.
function getInnerHeight(height, padding) {
  return height - padding.top - padding.bottom;
}

// Muodostaa funktion päivämäärän x-koordinaatin laskemiseen.
function createGetX(dates, padding, innerWidth) {
  return function getX(date) {
    const index = dates.indexOf(date);

    if (dates.length <= 1) {
      return padding.left + innerWidth / 2;
    }

    return (
      padding.left +
      (
        index /
        (dates.length - 1)
      ) *
      innerWidth
    );
  };
}

// Muodostaa funktion arvon y-koordinaatin laskemiseen.
function createGetY(
  roundedMaxValue,
  padding,
  innerHeight
) {
  return function getY(value) {
    return (
      padding.top +
      innerHeight -
      (
        value /
        roundedMaxValue
      ) *
      innerHeight
    );
  };
}

// Etsii toimipisteen datarivin annetulta päivältä.
function findLocationData(data, date, location) {
  return data.find(
    (entry) =>
      entry.date === date &&
      entry.location === location
  );
}

// Muuntaa datarivin SVG-pisteeksi.
function createChartPoint(item, date, valueKey, getX, getY) {
  if (!item) {
    return null;
  }

  return {
    x: getX(date),
    y: getY(item[valueKey]),
  };
}

// Muodostaa SVG-polun pisteistä.
function createPathFromPoints(points) {
  return points
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`
    )
    .join(" ");
}

// Muodostaa yhden toimipisteen SVG-polun.
function createLocationPath(
  location,
  dates,
  data,
  valueKey,
  getX,
  getY
) {
  const points = dates
    .map((date) => {
      const item = findLocationData(
        data,
        date,
        location
      );

      return createChartPoint(
        item,
        date,
        valueKey,
        getX,
        getY
      );
    })
    .filter(Boolean);

  return createPathFromPoints(points);
}

// Valitsee x-akselilla näytettävät päivämäärät.
function getVisibleDateLabels(
  dates
) {
  if (!dates.length) {
    return [];
  }

  const labelStep =
    Math.max(
      1,
      Math.ceil(
        dates.length / 10
      )
    );

  const labels =
    dates.filter(
      (_, index) =>
        index % labelStep === 0
    );

  const lastDate =
    dates[dates.length - 1];

  if (
    !labels.includes(lastDate)
  ) {
    labels.push(lastDate);
  }

  return labels;
}

// Palauttaa toimipisteen kuvaajavärin.
function getLocationColor(location) {
  return COLORS[location] || "#2563eb";
}

// Palauttaa näkymän otsikon.
function getPageTitle(mode) {
  return mode === "realized"
    ? "Toteutuneet näytteet"
    : "Ennustetut näytteet";
}

// Palauttaa näkymässä näytettävän toimipistetekstin.
function getLocationLabel(
  selectedLocations,
  allSelected
) {
  return allSelected
    ? "Kaikki näytteenotot"
    : selectedLocations.join(", ");
}

// Palauttaa graafissa näytettävän aikavälin.
function getChartRangeLabel(
  mode,
  forecastRange,
  dates
) {
  if (mode === "forecast") {
    return forecastRange;
  }

  return `${formatDate(dates[0])}–${formatDate(
    dates[dates.length - 1]
  )}`;
}

// Näyttää tilan ennen suodattimien vahvistamista.
function WaitingView() {
  return (
    <main className="day-main">
      <WaitingState />
    </main>
  );
}

// Näyttää latausnäkymän datan haun aikana.
function LoadingView() {
  return (
    <main className="day-main">
      <Loading />
    </main>
  );
}

// Näyttää tyhjän datan tilan.
function EmptyDataView() {
  return (
    <main className="day-main">
      <div className="day-empty-state">
        Ei vielä näytettävää dataa.
      </div>
    </main>
  );
}

// Näyttää graafin toimipisteselitteen.
function ChartLegend({ locations }) {
  return (
    <div className="day-chart-legend">
      {locations.map((location) => (
        <span
          key={location}
          className="day-legend-item"
        >
          <i
            style={{
              backgroundColor:
                getLocationColor(location),
            }}
          />

          {location}
        </span>
      ))}
    </div>
  );
}

// Piirtää graafin vaakasuuntaiset apuviivat.
function ChartGrid({
  roundedMaxValue,
  getY,
  width,
  padding,
}) {
  return [0, 0.25, 0.5, 0.75, 1].map(
    (step) => {
      const value = Math.round(
        roundedMaxValue * step
      );
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
    }
  );
}

// Piirtää toimipisteiden kuvaajaviivat.
function ChartLines({
  locations,
  dates,
  getPath,
}) {
  const todayKey = toDateString(
    new Date()
  );

  const pastDates = dates.filter(
    (date) => date <= todayKey
  );

  const futureOnlyDates = dates.filter(
    (date) => date > todayKey
  );

  const transitionDate =
    pastDates.length > 0
      ? pastDates[pastDates.length - 1]
      : null;

  const futureDates =
    transitionDate &&
    futureOnlyDates.length > 0
      ? [
          transitionDate,
          ...futureOnlyDates,
        ]
      : futureOnlyDates;

  return locations.map(
    (location) => (
      <g key={location}>
        {pastDates.length > 1 && (
          <path
            d={getPath(
              location,
              pastDates
            )}
            fill="none"
            stroke={getLocationColor(
              location
            )}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {futureDates.length > 1 && (
          <path
            d={getPath(
              location,
              futureDates
            )}
            fill="none"
            stroke={getLocationColor(
              location
            )}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
          />
        )}
      </g>
    )
  );
}

// Piirtää kuvaajan yksittäiset datapisteet.
function ChartDots({
  data,
  valueKey,
  getX,
  getY,
}) {
  return data.map((item, index) => (
    <circle
      key={`${item.date}-${item.location}-${index}`}
      cx={getX(item.date)}
      cy={getY(item[valueKey])}
      r="4"
      fill={getLocationColor(item.location)}
      stroke="#ffffff"
      strokeWidth="2"
    >
      <title>
        {item.location} {formatDate(item.date)}:{" "}
        {item[valueKey]}
      </title>
    </circle>
  ));
}

// Piirtää x-akselin päivämäärätekstit.
function ChartDateLabels({
  dates,
  getX,
  height,
}) {
  return dates.map((date) => (
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
  ));
}

// Näyttää varsinaisen SVG-kuvaajan.
function LineChart({
  mode,
  locations,
  filteredData,
  valueKey,
  dates,
  visibleDateLabels,
  roundedMaxValue,
  getX,
  getY,
  getPath,
  showDots,
}) {
  return (
    <div className="day-line-chart-wrapper">
      <svg
        className="day-line-chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          mode === "forecast"
            ? "Ennustettujen näytteiden kuvaaja"
            : "Toteutuneiden näytteiden kuvaaja"
        }
      >
        <ChartGrid
          roundedMaxValue={roundedMaxValue}
          getY={getY}
          width={CHART_WIDTH}
          padding={CHART_PADDING}
        />

        <ChartLines
          locations={locations}
          dates={dates}
          getPath={getPath}
        />

        {showDots && (
          <ChartDots
            data={filteredData}
            valueKey={valueKey}
            getX={getX}
            getY={getY}
          />
        )}

        <ChartDateLabels
          dates={visibleDateLabels}
          getX={getX}
          height={CHART_HEIGHT}
        />
      </svg>
    </div>
  );
}


function ChartNavigation({
  rangeLabel,
  onPrevious,
  onNext,
  onReset,
  isShifted,
}) {
  return (
    <div className="day-chart-navigation">
      <button
        type="button"
        className="day-chart-navigation-button"
        onClick={onPrevious}
        aria-label="Siirry aikaisempaan ajanjaksoon"
      >
        ←
      </button>

      <button
        type="button"
        className="day-chart-navigation-range"
        onClick={onReset}
        disabled={!isShifted}
      >
        {rangeLabel}
      </button>

      <button
        type="button"
        className="day-chart-navigation-button"
        onClick={onNext}
        aria-label="Siirry myöhempään ajanjaksoon"
      >
        →
      </button>
    </div>
  );
}

// Näyttää graafikortin sisällön.
function ChartCard({
  mode,
  locations,
  filteredData,
  valueKey,
  dates,
  visibleDateLabels,
  roundedMaxValue,
  getX,
  getY,
  getPath,
  showDots,
  onPrevious,
  onNext,
  onReset,
  isShifted,
  rangeLabel,
}) {
  return (
    <section className="day-chart-card">
      <div className="day-chart-top">
        <ChartLegend locations={locations} />

        <ChartNavigation
          rangeLabel={rangeLabel}
          onPrevious={onPrevious}
          onNext={onNext}
          onReset={onReset}
          isShifted={isShifted}
        />
      </div>

      {filteredData.length === 0 ? (
        <div className="day-empty-state">
          Ei dataa tällä ajanjaksolla
        </div>
      ) : (
        <LineChart
          mode={mode}
          locations={locations}
          filteredData={filteredData}
          valueKey={valueKey}
          dates={dates}
          visibleDateLabels={visibleDateLabels}
          roundedMaxValue={roundedMaxValue}
          getX={getX}
          getY={getY}
          getPath={getPath}
          showDots={showDots}
        />
      )}
    </section>
  );
}

// Muotoilee päivämäärän otsikossa näytettävään muotoon.
function formatDisplayDate(value) {
  const date = toDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("fi-FI");
}

// Näyttää Day-näkymän otsikkoalueen.
function DayHeader({
  mode,
  selectedLocations,
  allSelected,
  startDate,
  endDate,
}) {
  const locationLabel = allSelected
    ? "Kaikki toimipisteet"
    : selectedLocations.join(", ");

  return (
    <div className="day-main-header">
      <div className="day-header">
        <h2 className="day-title">
          {mode === "realized"
            ? "Toteutuneet näytteet"
            : "Ennustetut näytteet"}
        </h2>

        <div className="day-header-meta">
          <span className="day-location">
            {allSelected
              ? "Kaikki toimipisteet"
              : selectedLocations.join(", ")}
          </span>

          {startDate && endDate && (
            <>
              <span className="day-meta-divider">
                •
              </span>

              <span className="day-date-range">
                {formatDisplayDate(startDate)}
                {" – "}
                {formatDisplayDate(endDate)}
              </span>
            </>
          )}

          {mode === "forecast" && (
            <>
              <span className="day-meta-divider">
                •
              </span>

              <span className="day-ai-label">
                Ennuste on tekoälyn luoma arvio ja tarkoitettu päätöksenteon tueksi
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Näyttää päiväkohtaisen graafin ja tilastot.
function DayContent({
  mode,
  locations,
  filteredData,
  statisticsData,
  valueKey,
  dates,
  visibleDateLabels,
  roundedMaxValue,
  getX,
  getY,
  getPath,
  showDots,
  onPrevious,
  onNext,
  onReset,
  isShifted,
  rangeLabel,
}) {
  return (
    <div className="day-content-layout">
      <ChartCard
        mode={mode}
        locations={locations}
        filteredData={filteredData}
        valueKey={valueKey}
        dates={dates}
        visibleDateLabels={visibleDateLabels}
        roundedMaxValue={roundedMaxValue}
        getX={getX}
        getY={getY}
        getPath={getPath}
        showDots={showDots}
        onPrevious={onPrevious}
        onNext={onNext}
        onReset={onReset}
        isShifted={isShifted}
        rangeLabel={rangeLabel}
      />

      <aside className="day-stat-column">
        <DayStat data={statisticsData} valueKey={valueKey} />
      </aside>
    </div>
  );
}

// Näyttää Day-näkymän datan ja kuvaajan.
function DayMain({ filters }) {
  const mode = filters?.mode || "realized";

  // Yksilöi nykyisen suodatinhaun. Kun tila tai suodattimet vaihtuvat,
  // vanhan näkymän aikasiirtymää ei käytetä uuden haun kanssa.
  const navigationKey = useMemo(
    () =>
      JSON.stringify({
        mode,
        forecastRange: filters?.forecastRange || null,
        startDate: toDateString(filters?.dateRange?.startDate),
        endDate: toDateString(filters?.dateRange?.endDate),
        locations: getSelectedLocations(filters),
      }),
    [
      mode,
      filters?.forecastRange,
      filters?.dateRange?.startDate,
      filters?.dateRange?.endDate,
      filters?.selectedLocations,
      filters?.selectedLocation,
    ]
  );

  const [navigationState, setNavigationState] = useState({
    key: navigationKey,
    offset: 0,
  });

  // Jos suodattimet ovat vaihtuneet, käytetään heti nollasiirtymää.
  // Näin ensimmäinen toteutuneen datan haku ei lähde ennusteen offsetilla.
  const periodOffset =
    navigationState.key === navigationKey
      ? navigationState.offset
      : 0;

  const originalStartDate = useMemo(() => {
    if (mode === "forecast") return startOfDay(new Date());
    return startOfDay(filters?.dateRange?.startDate);
  }, [mode, filters?.dateRange?.startDate]);

  const originalEndDateExclusive = useMemo(() => {
    if (mode === "forecast") {
      return addDays(
        originalStartDate,
        getForecastDays(filters?.forecastRange)
      );
    }

    return startOfDay(
      filters?.dateRange?.endDateExclusive ||
        addOneDay(filters?.dateRange?.endDate)
    );
  }, [
    mode,
    originalStartDate,
    filters?.forecastRange,
    filters?.dateRange?.endDateExclusive,
    filters?.dateRange?.endDate,
  ]);

  const periodLength = useMemo(
    () => getDaysBetween(originalStartDate, originalEndDateExclusive),
    [originalStartDate, originalEndDateExclusive]
  );

  const visibleStartDate = useMemo(
    () => addDays(originalStartDate, periodOffset * periodLength),
    [originalStartDate, periodOffset, periodLength]
  );

  const visibleEndDateExclusive = useMemo(
    () => addDays(visibleStartDate, periodLength),
    [visibleStartDate, periodLength]
  );

  const navigationFilters = useMemo(
    () => ({
      ...filters,
      dateRange: {
        ...filters?.dateRange,
        startDate: visibleStartDate,
        endDate: addDays(visibleEndDateExclusive, -1),
        endDateExclusive: visibleEndDateExclusive,
      },
      forecastDays:
        mode === "forecast"
          ? Math.max(
              periodLength,
              periodLength * (periodOffset + 1)
            )
          : undefined,
      forecastOffsetDays:
        mode === "forecast"
          ? periodOffset * periodLength
          : 0,
    }),
    [
      filters,
      visibleStartDate,
      visibleEndDateExclusive,
      mode,
      periodLength,
      periodOffset,
    ]
  );

  const {
    data: backendData,
    loading,
  } = useRealData(navigationFilters);

  if (!filters?.hasApplied) {
    return <WaitingView />;
  }

  if (loading) {
    return <LoadingView />;
  }

  const dayData = normalizeBackendData(backendData);

  const valueKey = getValueKey(mode);
  const selectedLocations = getSelectedLocations(filters);
  const allSelected = areAllLocationsSelected(selectedLocations);
  const sourceData =
    prepareSourceData(
      dayData,
      visibleStartDate,
      visibleEndDateExclusive
    );

  const baseFilteredData = filterData(
    sourceData,
    selectedLocations,
    allSelected,
    visibleStartDate,
    visibleEndDateExclusive
  );
  const filteredData = getFilteredData(baseFilteredData, allSelected);
  const locations = getLocations(filteredData);
  const dates = getDates(filteredData);
  const statisticsData = getStatisticsData(filteredData, valueKey);
  const roundedMaxValue = getRoundedMaxValue(filteredData, valueKey);
  const innerWidth = getInnerWidth(CHART_WIDTH, CHART_PADDING);
  const innerHeight = getInnerHeight(CHART_HEIGHT, CHART_PADDING);
  const getX = createGetX(dates, CHART_PADDING, innerWidth);
  const getY = createGetY(
    roundedMaxValue,
    CHART_PADDING,
    innerHeight
  );

  function getPath(
    location,
    pathDates = dates
  ) {
    return createLocationPath(
      location,
      pathDates,
      filteredData,
      valueKey,
      getX,
      getY
    );
  }

  const visibleDateLabels = getVisibleDateLabels(dates);
  const showDots = dates.length <= 45;
  const rangeLabel = `${formatDate(toDateString(visibleStartDate))}–${formatDate(
    toDateString(addDays(visibleEndDateExclusive, -1))
  )}`;

  return (
    <main className="day-main">
      <DayHeader
        mode={mode}
        selectedLocations={selectedLocations}
        allSelected={allSelected}
        startDate={visibleStartDate}
        endDate={addDays(visibleEndDateExclusive, -1)}
      />

      <DayContent
        mode={mode}
        locations={locations}
        filteredData={filteredData}
        statisticsData={statisticsData}
        valueKey={valueKey}
        dates={dates}
        visibleDateLabels={visibleDateLabels}
        roundedMaxValue={roundedMaxValue}
        getX={getX}
        getY={getY}
        getPath={getPath}
        showDots={showDots}
        onPrevious={() =>
          setNavigationState({
            key: navigationKey,
            offset: periodOffset - 1,
          })
        }
        onNext={() =>
          setNavigationState({
            key: navigationKey,
            offset: periodOffset + 1,
          })
        }
        onReset={() =>
          setNavigationState({
            key: navigationKey,
            offset: 0,
          })
        }
        isShifted={periodOffset !== 0}
        rangeLabel={rangeLabel}
      />
    </main>
  );
}

export default DayMain;