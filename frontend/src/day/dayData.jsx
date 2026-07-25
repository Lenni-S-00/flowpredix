import { useEffect, useState } from "react";
import API from "../api";

const RANGE_DAYS = {
  "2 viikkoa": 14,
  "3 viikkoa": 21,
  Kuukausi: 30,
  "2 kuukautta": 60,
  "3 kuukautta": 90,
  "6 kuukautta": 180,
};

const DEFAULT_RANGE_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;


// Palauttaa annetun päivämäärän päivän alkuun asetettuna.
function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return date;
}


// Lisää annettuun päivämäärään halutun määrän päiviä.
function addDays(value, amount) {
  const date = startOfDay(value);
  date.setDate(date.getDate() + amount);

  return date;
}


// Laskee kahden päivämäärän välissä olevien päivien määrän.
function getDaysBetween(start, endExclusive) {
  const difference =
    startOfDay(endExclusive) - startOfDay(start);

  return Math.max(
    0,
    Math.round(difference / MILLISECONDS_PER_DAY)
  );
}


// Muuntaa päivämäärän API:n käyttämään YYYY-MM-DD-muotoon.
function toApiDate(value) {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// Palauttaa suodattimista valitut toimipisteet.
function getSelectedLocations(filters) {
  return filters.selectedLocations || [];
}


// Tarkistaa, ovatko kaikki toimipisteet valittuina.
function areAllLocationsSelected(selectedLocations) {
  return (
    selectedLocations.length === 0 ||
    selectedLocations.includes("Kaikki näytteenotot")
  );
}


// Palauttaa suodattimista näkyvän aikavälin alkupäivän.
function getVisibleStartDate(filters) {
  const selectedStartDate =
    filters.dateRange?.startDate || new Date();

  return startOfDay(selectedStartDate);
}


// Palauttaa ennustejakson pituuden suodattimista.
function getRequestedForecastDays(filters) {
  const rangeDays =
    RANGE_DAYS[filters.forecastRange] ||
    DEFAULT_RANGE_DAYS;

  return Number(filters.forecastDays) || rangeDays;
}


// Laskee ennustetilan aikavälin poissulkevan loppupäivän.
function getForecastEndDateExclusive(filters, startDate) {
  const forecastDays =
    getRequestedForecastDays(filters);

  return addDays(startDate, forecastDays);
}


// Laskee toteutuneen datan aikavälin poissulkevan loppupäivän.
function getRealizedEndDateExclusive(filters, startDate) {
  if (filters.dateRange?.endDateExclusive) {
    return startOfDay(
      filters.dateRange.endDateExclusive
    );
  }

  if (filters.dateRange?.endDate) {
    return addDays(
      filters.dateRange.endDate,
      1
    );
  }

  return addDays(
    startDate,
    DEFAULT_RANGE_DAYS
  );
}


// Palauttaa näkyvän aikavälin poissulkevan loppupäivän.
function getVisibleEndDateExclusive(filters) {
  const startDate =
    getVisibleStartDate(filters);

  if (filters.mode === "forecast") {
    return getForecastEndDateExclusive(
      filters,
      startDate
    );
  }

  return getRealizedEndDateExclusive(
    filters,
    startDate
  );
}


// Lisää toimipisteparametrin, kun kaikkia toimipisteitä ei haeta.
function addLocationsParam(
  params,
  selectedLocations,
  allSelected
) {
  if (!allSelected) {
    params.locations =
      selectedLocations.join(",");
  }

  return params;
}


// Muodostaa toteutuneen päiväkohtaisen datan API-parametrit.
function createSummaryParams(
  selectedLocations,
  allSelected,
  startDate,
  endDateExclusive
) {
  const params = {
    start: toApiDate(startDate),

    // Summary-endpoint käyttää inklusiivista loppupäivää.
    end: toApiDate(
      addDays(endDateExclusive, -1)
    ),
  };

  return addLocationsParam(
    params,
    selectedLocations,
    allSelected
  );
}


// Laskee ennustepyynnössä käytettävän päivien määrän.
function calculateForecastDays(
  filters,
  endDateExclusive
) {
  const today = startOfDay(new Date());

  const requestedDays =
    getRequestedForecastDays(filters);

  const endBasedDays = getDaysBetween(
    today,
    endDateExclusive
  );

  return Math.max(
    1,
    requestedDays,
    endBasedDays
  );
}


// Lisää ennustepyyntöön yksittäisen toimipisteen.
function addForecastLocationParam(params, location) {
  if (location) {
    params.location = location;
  }

  return params;
}


// Tulostaa ennustepyynnön parametrit kehityskonsoliin.
function logForecastParams(
  filters,
  endDateExclusive,
  params
) {
  console.log(
    "Päiväennusteen API-parametrit:",
    {
      forecastRange:
        filters.forecastRange,
      forecastDays:
        filters.forecastDays,
      endDateExclusive:
        toApiDate(endDateExclusive),
      days:
        params.days,
      location:
        params.location || "kaikki",
    }
  );
}


// Muodostaa päiväennusteen API-parametrit yhdelle toimipisteelle.
function createForecastParams(
  filters,
  endDateExclusive,
  location = null
) {
  const params = {
    days: calculateForecastDays(
      filters,
      endDateExclusive
    ),
  };

  addForecastLocationParam(params, location);

  logForecastParams(
    filters,
    endDateExclusive,
    params
  );

  return params;
}


// Poimii summary-endpointin rivit API-vastauksesta.
function getSummaryRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData?.results || [];
}


// Poimii ennusterivit API-vastauksesta.
function getPredictionRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData?.predictions || [];
}


// Palauttaa rivin päivämäärän eri mahdollisista kentistä.
function getRowDate(row) {
  return (
    row.date ||
    row.prediction_date ||
    row.timestamp?.split("T")[0]
  );
}


// Tarkistaa, kuuluuko rivi pyydetylle aikavälille.
function rowIsWithinRange(
  row,
  startDate,
  endDateExclusive
) {
  const rowDateValue = getRowDate(row);

  if (!rowDateValue) {
    return false;
  }

  const rowDate = startOfDay(rowDateValue);

  return (
    rowDate >= startDate &&
    rowDate < endDateExclusive
  );
}


// Palauttaa toteutuneen arvon rivin mahdollisista kentistä.
function getHistoryValue(row) {
  return Number(
    row.realized ??
      row.samples_taken ??
      0
  );
}


// Muuntaa toteutuneen datan käyttöliittymän yhteiseen muotoon.
function mapHistoryRow(row) {
  const value = getHistoryValue(row);

  return {
    ...row,
    realized: value,
    forecast: value,
    dataType: "realized",
  };
}


// Palauttaa ennustearvon rivin mahdollisista kentistä.
function getPredictionValue(row) {
  return Number(
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


// Muuntaa ennustedatan käyttöliittymän yhteiseen muotoon.
function mapPredictionRow(row) {
  const value = getPredictionValue(row);

  return {
    ...row,
    realized: value,
    forecast: value,
    dataType: "forecast",
  };
}

// Lisää ennusteriville toimipisteen, jos backend ei palauta sitä.
function attachLocationToPredictionRow(row, location) {
  return {
    ...row,
    location:
      row.location ||
      row.location_name ||
      location ||
      "Kaikki näytteenotot",
  };
}


// Hakee toteutuneen päiväkohtaisen datan annetulta aikaväliltä.
async function fetchSummaryRange(
  selectedLocations,
  allSelected,
  startDate,
  endDateExclusive
) {
  if (startDate >= endDateExclusive) {
    return [];
  }

  const params = createSummaryParams(
    selectedLocations,
    allSelected,
    startDate,
    endDateExclusive
  );

  const response = await API.get(
    "data/summary/",
    { params }
  );

  return getSummaryRows(response.data);
}


// Suodattaa ennusterivit näkyvälle aikavälille.
function filterPredictionRows(
  rows,
  startDate,
  endDateExclusive
) {
  return rows.filter((row) =>
    rowIsWithinRange(
      row,
      startDate,
      endDateExclusive
    )
  );
}


// Hakee yhden toimipisteen ennustedatan annetulta aikaväliltä.
async function fetchLocationPredictionRange(
  filters,
  location,
  startDate,
  endDateExclusive
) {
  const params = createForecastParams(
    filters,
    endDateExclusive,
    location
  );

  const response = await API.get(
    "predict/",
    { params }
  );

  const rows = getPredictionRows(response.data)
    .map((row) =>
      attachLocationToPredictionRow(row, location)
    );

  return filterPredictionRows(
    rows,
    startDate,
    endDateExclusive
  );
}

// Hakee ennustedatan kaikille valituille toimipisteille.
async function fetchPredictionRange(
  filters,
  selectedLocations,
  allSelected,
  startDate,
  endDateExclusive
) {
  if (startDate >= endDateExclusive) {
    return [];
  }

  if (allSelected) {
    const rows = await fetchLocationPredictionRange(
      filters,
      null,
      startDate,
      endDateExclusive
    );

    console.log(
      "Backendin palauttama yhdistetty ennustedata:",
      rows.length,
      rows
    );

    return rows;
  }

  const requests = selectedLocations.map((location) =>
    fetchLocationPredictionRange(
      filters,
      location,
      startDate,
      endDateExclusive
    )
  );

  const responses = await Promise.all(requests);
  const rows = responses.flat();

  console.log(
    "Backendin palauttamat toimipistekohtaiset ennusterivit:",
    rows.length,
    rows
  );

  return rows;
}


// Laskee näkyvästä aikavälistä toteutuneen datan osuuden.
function getHistoryRange(
  visibleStart,
  visibleEndExclusive,
  today
) {
  return {
    startDate: visibleStart,
    endDateExclusive:
      visibleEndExclusive < today
        ? visibleEndExclusive
        : today,
  };
}


// Laskee näkyvästä aikavälistä ennustedatan osuuden.
function getForecastRange(
  visibleStart,
  visibleEndExclusive,
  today
) {
  return {
    startDate:
      visibleStart > today
        ? visibleStart
        : today,
    endDateExclusive:
      visibleEndExclusive,
  };
}


// Tarkistaa, sisältääkö aikaväli toteutunutta dataa.
function shouldFetchHistory(
  visibleStart,
  today
) {
  return visibleStart < today;
}


// Tarkistaa, sisältääkö aikaväli ennustedataa.
function shouldFetchForecast(
  visibleEndExclusive,
  today
) {
  return visibleEndExclusive > today;
}


// Hakee näkyvän aikavälin toteutuneen datan.
function fetchVisibleHistory(
  selectedLocations,
  allSelected,
  visibleStart,
  visibleEndExclusive,
  today
) {
  if (!shouldFetchHistory(visibleStart, today)) {
    return Promise.resolve([]);
  }

  const range = getHistoryRange(
    visibleStart,
    visibleEndExclusive,
    today
  );

  return fetchSummaryRange(
    selectedLocations,
    allSelected,
    range.startDate,
    range.endDateExclusive
  );
}


// Hakee näkyvän aikavälin ennustedatan.
function fetchVisibleForecast(
  filters,
  selectedLocations,
  allSelected,
  visibleStart,
  visibleEndExclusive,
  today
) {
  if (
    !shouldFetchForecast(
      visibleEndExclusive,
      today
    )
  ) {
    return Promise.resolve([]);
  }

  const range = getForecastRange(
    visibleStart,
    visibleEndExclusive,
    today
  );

  return fetchPredictionRange(
    filters,
    selectedLocations,
    allSelected,
    range.startDate,
    range.endDateExclusive
  );
}


// Yhdistää toteutuneet ja ennustetut rivit samalle aikajanalle.
function combineTimelineRows(
  historyRows,
  predictionRows
) {
  return [
    ...historyRows.map(mapHistoryRow),
    ...predictionRows.map(mapPredictionRow),
  ];
}


// Hakee näkyvän aikavälin toteutuneen ja ennustetun datan.
async function fetchTimelineData(
  filters,
  selectedLocations,
  allSelected
) {
  const today = startOfDay(new Date());

  const visibleStart =
    getVisibleStartDate(filters);

  const visibleEndExclusive =
    getVisibleEndDateExclusive(filters);

  const historyRequest =
    fetchVisibleHistory(
      selectedLocations,
      allSelected,
      visibleStart,
      visibleEndExclusive,
      today
    );

  const forecastRequest =
    fetchVisibleForecast(
      filters,
      selectedLocations,
      allSelected,
      visibleStart,
      visibleEndExclusive,
      today
    );

  const [
    historyRows,
    predictionRows,
  ] = await Promise.all([
    historyRequest,
    forecastRequest,
  ]);

  return combineTimelineRows(
    historyRows,
    predictionRows
  );
}


// Hakee päivägraafin datan nykyisten suodattimien perusteella.
async function fetchDayData(filters) {
  const selectedLocations =
    getSelectedLocations(filters);

  const allSelected =
    areAllLocationsSelected(
      selectedLocations
    );

  return fetchTimelineData(
    filters,
    selectedLocations,
    allSelected
  );
}


// Palauttaa päiväkohtaisen datan haun virheviestin.
function getFetchErrorMessage() {
  return (
    "Toteutuneen ja ennustedatan haku epäonnistui:"
  );
}


// Tulostaa datan haussa tapahtuneen virheen konsoliin.
function logFetchError(error) {
  console.error(
    getFetchErrorMessage(),
    error.response?.data || error
  );
}


// Muodostaa valittujen toimipisteiden riippuvuusarvon hookille.
function getLocationsDependency(filters) {
  return JSON.stringify(
    filters?.selectedLocations || []
  );
}


// Hakee päiväkohtaisen datan ja päivittää hookin tilan.
async function loadDayData(
  filters,
  isCancelled,
  setData,
  setLoading
) {
  setLoading(true);

  try {
    const rows =
      await fetchDayData(filters);

    if (!isCancelled()) {
      setData(rows);
    }
  } catch (error) {
    logFetchError(error);

    if (!isCancelled()) {
      setData([]);
    }
  } finally {
    if (!isCancelled()) {
      setLoading(false);
    }
  }
}


// Tarjoaa päiväkohtaisen toteuma- ja ennustedatan React-komponenteille.
export function useRealData(filters) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const locationsDependency =
    getLocationsDependency(filters);

  useEffect(() => {
    if (!filters?.hasApplied) {
      setData([]);
      setLoading(false);

      return undefined;
    }

    let cancelled = false;

    // Kertoo asynkroniselle haulle, onko effect jo purettu.
    function isCancelled() {
      return cancelled;
    }

    loadDayData(
      filters,
      isCancelled,
      setData,
      setLoading
    );

    return () => {
      cancelled = true;
    };
  }, [
    filters?.hasApplied,
    filters?.mode,
    filters?.forecastRange,
    filters?.forecastDays,
    filters?.forecastOffsetDays,
    filters?.dateRange?.startDate,
    filters?.dateRange?.endDate,
    filters?.dateRange?.endDateExclusive,
    locationsDependency,
  ]);

  return {
    data,
    loading,
  };
}