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

// Muotoilee päivämäärän graafissa näytettävään muotoon.
function formatDate(dateString) {
  const date = new Date(dateString);

  return `${date.getDate()}.${date.getMonth() + 1}.`;
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
function fillMissingDates(data) {
  if (!data.length) {
    return [];
  }

  const sortedData = sortDataByDate(data);
  const locations = getLocations(sortedData);
  const startDate = startOfDay(sortedData[0].date);
  const endDate = startOfDay(
    sortedData[sortedData.length - 1].date
  );
  const existingData = createDataMap(sortedData);
  const filledData = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateString = currentDate
      .toISOString()
      .split("T")[0];

    appendDateRows(
      filledData,
      existingData,
      dateString,
      locations
    );

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return filledData;
}

// Tarkistaa, sisältääkö datarivi tarvittavat perustiedot.
function isValidDataRow(item) {
  return Boolean(item.date && item.location);
}

// Valmistelee datan suodatusta varten.
function prepareSourceData(data) {
  return fillMissingDates(data)
    .filter(isValidDataRow)
    .sort(
      (first, second) =>
        new Date(first.date) - new Date(second.date)
    );
}

// Palauttaa näkymän käyttämän arvokentän.
function getValueKey(mode) {
  return mode === "forecast"
    ? "forecast"
    : "realized";
}

// Palauttaa käyttäjän valitsemat toimipisteet.
function getSelectedLocations(filters) {
  return (
    filters.selectedLocations || [
      "Kaikki näytteenotot",
    ]
  );
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
function getVisibleDateLabels(dates) {
  const labelStep = Math.max(
    1,
    Math.ceil(dates.length / 10)
  );

  return dates.filter(
    (_, index) => index % labelStep === 0
  );
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
  mode,
  getPath,
}) {
  return locations.map((location) => (
    <path
      key={location}
      d={getPath(location)}
      fill="none"
      stroke={getLocationColor(location)}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={
        mode === "forecast"
          ? "8 6"
          : undefined
      }
    />
  ));
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
          mode={mode}
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

// Näyttää graafikortin sisällön.
function ChartCard({
  mode,
  filters,
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
  if (filteredData.length === 0) {
    return (
      <section className="day-chart-card">
        <div className="day-empty-state">
          Ei dataa valituilla suodattimilla
        </div>
      </section>
    );
  }

  return (
    <section className="day-chart-card">
      <div className="day-chart-top">
        <ChartLegend locations={locations} />

        <span className="day-chart-range">
          {getChartRangeLabel(
            mode,
            filters.forecastRange,
            dates
          )}
        </span>
      </div>

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
    </section>
  );
}

// Näyttää Day-näkymän otsikkoalueen.
function DayHeader({
  mode,
  selectedLocations,
  allSelected,
}) {
  return (
    <div className="day-main-header">
      <div>
        <h1>{getPageTitle(mode)}</h1>

        <span>
          {getLocationLabel(
            selectedLocations,
            allSelected
          )}
        </span>
      </div>
    </div>
  );
}

// Näyttää päiväkohtaisen graafin ja tilastot.
function DayContent({
  mode,
  filters,
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
}) {
  return (
    <div className="day-content-layout">
      <ChartCard
        mode={mode}
        filters={filters}
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

      <aside className="day-stat-column">
        <DayStat
          data={statisticsData}
          valueKey={valueKey}
        />
      </aside>
    </div>
  );
}

// Näyttää Day-näkymän datan ja kuvaajan.
function DayMain({ filters }) {
  const backendData = useRealData(filters);
  const dayData = normalizeBackendData(backendData);

  console.log("Backend data:", backendData);
  console.log("Normalisoitu data:", dayData);

  if (!filters?.hasApplied) {
    return <WaitingView />;
  }

  const mode = filters.mode || "realized";
  const valueKey = getValueKey(mode);
  const selectedLocations =
    getSelectedLocations(filters);
  const allSelected =
    areAllLocationsSelected(selectedLocations);
  const sourceData = prepareSourceData(dayData);

  if (sourceData.length === 0) {
    return <EmptyDataView />;
  }

  const today = startOfDay(new Date());
  const firstDate =
    mode === "forecast"
      ? today
      : startOfDay(sourceData[0]?.date);
  const forecastDays = getForecastDays(
    filters.forecastRange
  );
  const forecastEndDate = getForecastEndDate(
    firstDate,
    forecastDays
  );
  const startDate = getFilterStartDate(
    mode,
    firstDate,
    filters.dateRange
  );
  const endDateExclusive = getFilterEndDate(
    mode,
    forecastEndDate,
    filters.dateRange
  );
  const baseFilteredData = filterData(
    sourceData,
    selectedLocations,
    allSelected,
    startDate,
    endDateExclusive
  );
  const filteredData = getFilteredData(
    baseFilteredData,
    allSelected
  );
  const locations = getLocations(filteredData);
  const dates = getDates(filteredData);
  const statisticsData = getStatisticsData(
    filteredData,
    valueKey
  );
  const roundedMaxValue = getRoundedMaxValue(
    filteredData,
    valueKey
  );
  const innerWidth = getInnerWidth(
    CHART_WIDTH,
    CHART_PADDING
  );
  const innerHeight = getInnerHeight(
    CHART_HEIGHT,
    CHART_PADDING
  );
  const getX = createGetX(
    dates,
    CHART_PADDING,
    innerWidth
  );
  const getY = createGetY(
    roundedMaxValue,
    CHART_PADDING,
    innerHeight
  );

  // Muodostaa valitun toimipisteen SVG-polun.
  function getPath(location) {
    return createLocationPath(
      location,
      dates,
      filteredData,
      valueKey,
      getX,
      getY
    );
  }

  const visibleDateLabels =
    getVisibleDateLabels(dates);
  const showDots = dates.length <= 45;

  return (
    <main className="day-main">
      <DayHeader
        mode={mode}
        selectedLocations={selectedLocations}
        allSelected={allSelected}
      />

      <DayContent
        mode={mode}
        filters={filters}
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
      />
    </main>
  );
}

export default DayMain;
