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

function startOfDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, amount) {
  const date = startOfDay(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function getDaysBetween(start, endExclusive) {
  return Math.max(
    0,
    Math.round(
      (startOfDay(endExclusive) - startOfDay(start)) /
        (24 * 60 * 60 * 1000)
    )
  );
}

function toApiDate(value) {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSelectedLocations(filters) {
  return filters.selectedLocations || [];
}

function areAllLocationsSelected(selectedLocations) {
  return (
    selectedLocations.length === 0 ||
    selectedLocations.includes("Kaikki näytteenotot")
  );
}

function getVisibleStartDate(filters) {
  return startOfDay(filters.dateRange?.startDate || new Date());
}

function getVisibleEndDateExclusive(filters) {
  if (filters.dateRange?.endDateExclusive) {
    return startOfDay(filters.dateRange.endDateExclusive);
  }

  if (filters.dateRange?.endDate) {
    return addDays(filters.dateRange.endDate, 1);
  }

  return addDays(
    getVisibleStartDate(filters),
    RANGE_DAYS[filters.forecastRange] || 14
  );
}

function createSummaryParams(
  filters,
  selectedLocations,
  allSelected,
  startDate = filters.dateRange?.startDate,
  endDateExclusive = filters.dateRange?.endDateExclusive
) {
  const params = {
    start: toApiDate(startDate),
    // Summary-endpoint käyttää inklusiivista loppupäivää.
    end: toApiDate(addDays(endDateExclusive, -1)),
  };

  if (!allSelected) {
    params.locations = selectedLocations.join(",");
  }

  return params;
}

function createForecastParams(
  selectedLocations,
  allSelected,
  endDateExclusive
) {
  const today = startOfDay(new Date());
  const days = Math.max(1, getDaysBetween(today, endDateExclusive));
  const params = { days };

  if (!allSelected && selectedLocations.length === 1) {
    params.location = selectedLocations[0];
  }

  return params;
}

function getSummaryRows(responseData) {
  return Array.isArray(responseData)
    ? responseData
    : responseData?.results || [];
}

function getPredictionRows(responseData) {
  if (Array.isArray(responseData)) return responseData;
  return responseData?.predictions || [];
}

function getRowDate(row) {
  return row.date || row.prediction_date || row.timestamp?.split("T")[0];
}

function rowIsWithinRange(row, startDate, endDateExclusive) {
  const rowDate = startOfDay(getRowDate(row));
  return rowDate >= startDate && rowDate < endDateExclusive;
}

// Toteutunut arvo annetaan sekä realized- että forecast-kentässä.
// Näin historia näkyy myös silloin, kun navigointi aloitettiin ennustetilasta.
function mapHistoryRow(row) {
  const value = Number(row.realized ?? row.samples_taken ?? 0);

  return {
    ...row,
    realized: value,
    forecast: value,
    dataType: "realized",
  };
}

// Ennustearvo annetaan myös realized-kentässä.
// Näin ennuste näkyy, vaikka navigointi aloitettiin toteutuneet-tilasta.
function mapPredictionRow(row) {
  const value = Number(
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

  return {
    ...row,
    realized: value,
    forecast: value,
    dataType: "forecast",
  };
}

async function fetchSummaryRange(
  filters,
  selectedLocations,
  allSelected,
  startDate,
  endDateExclusive
) {
  if (startDate >= endDateExclusive) return [];

  const params = createSummaryParams(
    filters,
    selectedLocations,
    allSelected,
    startDate,
    endDateExclusive
  );

  const response = await API.get("data/summary/", { params });
  return getSummaryRows(response.data);
}

async function fetchPredictionRange(
  selectedLocations,
  allSelected,
  startDate,
  endDateExclusive
) {
  if (startDate >= endDateExclusive) return [];

  const params = createForecastParams(
    selectedLocations,
    allSelected,
    endDateExclusive
  );

  const response = await API.get("predict/", { params });

  return getPredictionRows(response.data).filter((row) =>
    rowIsWithinRange(row, startDate, endDateExclusive)
  );
}

async function fetchTimelineData(
  filters,
  selectedLocations,
  allSelected
) {
  const today = startOfDay(new Date());
  const visibleStart = getVisibleStartDate(filters);
  const visibleEndExclusive = getVisibleEndDateExclusive(filters);

  // Menneeseen kuuluva osa päättyy viimeistään tähän päivään.
  const historyEndExclusive =
    visibleEndExclusive < today ? visibleEndExclusive : today;

  // Ennuste alkaa aikaisintaan tästä päivästä.
  const forecastStart = visibleStart > today ? visibleStart : today;

  const [historyRows, predictionRows] = await Promise.all([
    visibleStart < today
      ? fetchSummaryRange(
          filters,
          selectedLocations,
          allSelected,
          visibleStart,
          historyEndExclusive
        )
      : Promise.resolve([]),
    visibleEndExclusive > today
      ? fetchPredictionRange(
          selectedLocations,
          allSelected,
          forecastStart,
          visibleEndExclusive
        )
      : Promise.resolve([]),
  ]);

  return [
    ...historyRows.map(mapHistoryRow),
    ...predictionRows.map(mapPredictionRow),
  ];
}

async function fetchDayData(filters) {
  const selectedLocations = getSelectedLocations(filters);
  const allSelected = areAllLocationsSelected(selectedLocations);

  // Sama yhdistetty aikajanalogiiikka käytetään molemmissa tiloissa:
  // menneisyys haetaan toteumana ja tulevaisuus ennusteena.
  return fetchTimelineData(
    filters,
    selectedLocations,
    allSelected
  );
}

function getFetchErrorMessage() {
  return "Toteutuneen ja ennustedatan haku epäonnistui:";
}

export function useRealData(filters) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!filters?.hasApplied) {
      setData([]);
      return;
    }

    let cancelled = false;

    async function loadData() {
      try {
        const rows = await fetchDayData(filters);

        if (!cancelled) {
          setData(rows);
        }
      } catch (error) {
        console.error(
          getFetchErrorMessage(),
          error.response?.data || error
        );

        if (!cancelled) setData([]);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    filters?.hasApplied,
    filters?.mode,
    filters?.forecastRange,
    filters?.dateRange?.startDate,
    filters?.dateRange?.endDate,
    filters?.dateRange?.endDateExclusive,
    JSON.stringify(filters?.selectedLocations || []),
  ]);

  return data;
}