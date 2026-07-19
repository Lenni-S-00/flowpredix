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

// Muuntaa päivämäärän backendin käyttämään YYYY-MM-DD-muotoon.
function toApiDate(value) {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Palauttaa suodattimista valitut toimipisteet.
function getSelectedLocations(filters) {
  return filters.selectedLocations || [];
}

// Tarkistaa, onko kaikkien toimipisteiden data valittuna.
function areAllLocationsSelected(selectedLocations) {
  return (
    selectedLocations.length === 0 ||
    selectedLocations.includes("Kaikki näytteenotot")
  );
}

// Muodostaa ennustepyynnön query-parametrit.
function createForecastParams(filters, selectedLocations, allSelected) {
  const params = {
    days: RANGE_DAYS[filters.forecastRange] || 14,
  };

  if (!allSelected && selectedLocations.length === 1) {
    params.location = selectedLocations[0];
  }

  return params;
}

// Muodostaa toteutuneen datan query-parametrit.
function createSummaryParams(filters, selectedLocations, allSelected) {
  const params = {
    start: toApiDate(filters.dateRange?.startDate),
    end: toApiDate(filters.dateRange?.endDate),
  };

  if (!allSelected) {
    params.locations = selectedLocations.join(",");
  }

  return params;
}

// Muuntaa summary-endpointin vastauksen aina taulukoksi.
function getSummaryRows(responseData) {
  return Array.isArray(responseData)
    ? responseData
    : responseData?.results || [];
}

// Hakee ennustedatan backendistä.
async function fetchForecastData(filters, selectedLocations, allSelected) {
  const params = createForecastParams(
    filters,
    selectedLocations,
    allSelected
  );

  const response = await API.get("predict/", { params });

  console.log("Prediction response:", response.data);
  console.log("Prediction rows:", response.data?.predictions);

  return response.data?.predictions || [];
}

// Hakee toteutuneen datan backendistä.
async function fetchSummaryData(filters, selectedLocations, allSelected) {
  const params = createSummaryParams(
    filters,
    selectedLocations,
    allSelected
  );

  const response = await API.get("data/summary/", { params });

  console.log("Summary data:", response.data);

  return getSummaryRows(response.data);
}

// Valitsee suodatustilan perusteella käytettävän datanhaun.
async function fetchDayData(filters) {
  const selectedLocations = getSelectedLocations(filters);
  const allSelected = areAllLocationsSelected(selectedLocations);

  if (filters.mode === "forecast") {
    return fetchForecastData(
      filters,
      selectedLocations,
      allSelected
    );
  }

  return fetchSummaryData(
    filters,
    selectedLocations,
    allSelected
  );
}

// Muodostaa datanhaussa näytettävän virheviestin.
function getFetchErrorMessage(mode) {
  return mode === "forecast"
    ? "Ennusteen haku epäonnistui:"
    : "Yhteenvetodatan haku epäonnistui:";
}

// Hakee Day-näkymän datan valittujen suodattimien perusteella.
export function useRealData(filters) {
  const [data, setData] = useState([]);

  // Päivittää datan aina, kun käytettävät suodattimet muuttuvat.
  useEffect(() => {
    if (!filters?.hasApplied) {
      setData([]);
      return;
    }

    // Suorittaa datanhaun ja päivittää hookin tilan.
    async function loadData() {
      try {
        const rows = await fetchDayData(filters);
        setData(rows);
      } catch (error) {
        console.error(
          getFetchErrorMessage(filters.mode),
          error.response?.data || error
        );

        setData([]);
      }
    }

    loadData();
  }, [
    filters?.hasApplied,
    filters?.mode,
    filters?.forecastRange,
    filters?.dateRange?.startDate,
    filters?.dateRange?.endDate,
    JSON.stringify(filters?.selectedLocations || []),
  ]);

  return data;
}

