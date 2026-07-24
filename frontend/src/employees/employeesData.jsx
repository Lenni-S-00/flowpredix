import {
  useEffect,
  useState,
} from "react";
import API from "../api";

const FORECAST_DAYS = {
  "24 tuntia": 1,
  "2 päivää": 2,
  "3 päivää": 3,
  Viikko: 7,
  "2 viikkoa": 14,
  "3 viikkoa": 21,
  Kuukausi: 30,
};

// Tarkistaa, onko aktiivinen näkymä ennustetila.
function isForecastMode(mode) {
  return mode === "forecast";
}

// Palauttaa päivämäärän vuorokauden alusta.
function startOfDay(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

// Lisää päivämäärään annetun määrän päiviä.
function addDays(
  value,
  amount
) {
  const date =
    startOfDay(value);

  if (!date) {
    return null;
  }

  date.setDate(
    date.getDate() + amount
  );

  return date;
}

// Muuntaa päivämäärän API:n YYYY-MM-DD-muotoon.
function toApiDate(value) {
  const date =
    startOfDay(value);

  if (!date) {
    return undefined;
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Tarkistaa, tarkoittaako valinta kaikkia toimipisteitä.
function isAllLocationsSelected(
  location
) {
  return (
    !location ||
    location ===
      "Kaikki toimipisteet" ||
    location ===
      "Kaikki näytteenotot"
  );
}

// Palauttaa ennustejakson päivien määrän.
function getForecastDays(
  forecastRange
) {
  return (
    FORECAST_DAYS[
      forecastRange
    ] || 1
  );
}

// Palauttaa näkymän alkupäivän.
function getVisibleStartDate(
  filters
) {
  if (isForecastMode(filters.mode)) {
    return startOfDay(
      new Date()
    );
  }

  return startOfDay(
    filters.dateRange
      ?.startDate ||
      new Date()
  );
}

// Palauttaa näkymän poissulkevan loppupäivän.
function getVisibleEndDateExclusive(
  filters
) {
  if (isForecastMode(filters.mode)) {
    return addDays(
      new Date(),
      getForecastDays(
        filters.forecastRange
      )
    );
  }

  if (
    filters.dateRange
      ?.endDateExclusive
  ) {
    return startOfDay(
      filters.dateRange
        .endDateExclusive
    );
  }

  if (
    filters.dateRange
      ?.endDate
  ) {
    return addDays(
      filters.dateRange
        .endDate,
      1
    );
  }

  return addDays(
    getVisibleStartDate(
      filters
    ),
    1
  );
}

// Muuntaa arvon turvallisesti numeroksi.
function toNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}

// Poimii listan erilaisista API-vastausmuodoista.
function getResponseRows(
  responseData
) {
  if (
    Array.isArray(
      responseData
    )
  ) {
    return responseData;
  }

  const possibleRows = [
    responseData?.results,
    responseData?.data,
    responseData?.rows,
    responseData
      ?.hourly_data,
    responseData
      ?.predictions,
  ];

  return (
    possibleRows.find(
      Array.isArray
    ) || []
  );
}

// Palauttaa datarivin aikaleiman.
function getRowTimestamp(row) {
  if (!row) {
    return null;
  }

  const timestamp =
    row.hour_timestamp ??
    row.timestamp ??
    row.datetime ??
    row.date_time ??
    row.date ??
    null;

  if (timestamp) {
    return timestamp;
  }

  if (
    typeof row.hour ===
      "string" &&
    row.hour.includes("T")
  ) {
    return row.hour;
  }

  return null;
}

// Palauttaa datarivin tunnin.
function getRowHour(row) {
  if (!row) {
    return null;
  }

  if (
    typeof row.hour ===
      "number" &&
    Number.isFinite(
      row.hour
    )
  ) {
    return row.hour;
  }

  if (
    typeof row.hour ===
      "string" &&
    /^\d{1,2}$/.test(
      row.hour
    )
  ) {
    return Number(
      row.hour
    );
  }

  if (
    typeof row.hour ===
      "string" &&
    /^\d{1,2}:\d{2}/.test(
      row.hour
    )
  ) {
    return Number(
      row.hour.split(":")[0]
    );
  }

  const timestamp =
    getRowTimestamp(row);

  if (
    typeof timestamp !==
    "string"
  ) {
    return null;
  }

  const match =
    timestamp.match(
      /[T\s](\d{1,2}):/
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(match[1]);

  return Number.isFinite(hour)
    ? hour
    : null;
}

// Tarkistaa, kuuluuko rivi valittuun aikaväliin.
function rowIsWithinRange(
  row,
  startDate,
  endDateExclusive
) {
  const rawTimestamp =
    getRowTimestamp(row);

  if (!rawTimestamp) {
    return false;
  }

  const timestamp =
    new Date(rawTimestamp);

  if (
    Number.isNaN(
      timestamp.getTime()
    )
  ) {
    return false;
  }

  return (
    timestamp >= startDate &&
    timestamp <
      endDateExclusive
  );
}

// Lukee toteutuneen työntekijämäärän riviltä.
// Lukee toteutuneen työntekijämäärän riviltä.
function getRealizedEmployees(row) {
  return toNumber(
    row.employees_used ??
      row.total_employees ??
      row.employees_used__sum ??
      row.totalEmployees ??
      row.employee_count ??
      row.employeeCount ??
      row.employees ??
      row.realized_employees ??
      row.realizedEmployees,
    0
  );
}

// Lukee toteutuneen näytemäärän riviltä.
function getRealizedSamples(
  row
) {
  return toNumber(
    row.realized ??
      row.samples_taken ??
      row.total_samples ??
      row.samples ??
      row.sample_count ??
      row.patient_count ??
      row.count ??
      row.value,
    0
  );
}

// Lukee ennustetun näytemäärän henkilöstöennusteriviltä.
function getPredictedSamples(
  row
) {
  return toNumber(
    row.prediction ??
      row.forecast ??
      row.predicted_samples ??
      row.predicted_patient_count ??
      row.predicted_samples_taken ??
      row.predicted_value ??
      row.samples ??
      row.value,
    0
  );
}

// Lukee backendin laskeman suositellun työntekijämäärän.
function getRecommendedEmployees(
  row
) {
  return toNumber(
    row.recommended_employees ??
      row.required_employees ??
      row.employee_estimate ??
      row.forecast_employees ??
      row.predicted_employees,
    0
  );
}

// Lukee backendin pyöristämättömän henkilöstöarvion.
function getRawEmployeeEstimate(
  row
) {
  return toNumber(
    row.raw_employee_estimate ??
      row.rawEmployeeEstimate ??
      row.employee_estimate,
    getRecommendedEmployees(
      row
    )
  );
}

// Poimii aikaleimasta YYYY-MM-DD-päivämäärän.
function getDateFromTimestamp(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const match = value.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

    if (match) {
      return match[1];
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
}

// Muotoilee toteutuneen henkilöstödatan käyttöliittymää varten.
function mapHistoryRow(item) {
  const rawTimestamp =
    item.hour_timestamp ??
    item.hour ??
    item.timestamp ??
    item.datetime ??
    item.date_time ??
    item.date ??
    null;

  const realizedEmployees =
    getRealizedEmployees(item);

  const realizedSamples =
    toNumber(
      item.realized ??
        item.samples_taken ??
        item.total_samples ??
        item.samples ??
        item.value ??
        0
    );

  return {
    ...item,

    date:
      item.date ??
      getDateFromTimestamp(
        rawTimestamp
      ),

    // Säilytetään API:n tuntiaikaleima.
    hour: rawTimestamp,

    // Heatmap ja tilastot voivat käyttää samaa aikaleimaa.
    timestamp: rawTimestamp,

    location:
      item.location ?? "",

    realized:
      realizedSamples,

    forecast:
      realizedSamples,

    samples:
      realizedSamples,

    employees_used:
      realizedEmployees,

    realizedEmployees,

    employeeValue:
      realizedEmployees,

    requiredEmployees:
      realizedEmployees,

    forecastEmployees:
      realizedEmployees,

    dataType: "realized",
  };
}

// Muuntaa backendin henkilöstöennusteen näkymän muotoon.
function mapPredictionRow(row) {
  const timestamp =
    getRowTimestamp(row);

  const hour =
    getRowHour(row);

  const predictedSamples =
    getPredictedSamples(row);

  const recommendedEmployees =
    getRecommendedEmployees(
      row
    );

  const rawEmployeeEstimate =
    getRawEmployeeEstimate(
      row
    );

  return {
    ...row,

    date:
      timestamp ??
      row.date ??
      null,

    timestamp:
      timestamp ??
      row.date ??
      null,

    hour,

    samples:
      predictedSamples,

    realized:
      predictedSamples,

    forecast:
      predictedSamples,

    predictedSamples,

    recommendedEmployees,

    employeeValue:
      recommendedEmployees,

    requiredEmployees:
      recommendedEmployees,

    forecastEmployees:
      recommendedEmployees,

    rawEmployeeEstimate,

    estimationMethod:
      row.estimation_method ??
      row.estimationMethod ??
      null,

    comparisonRows:
      toNumber(
        row.comparison_rows ??
          row.comparisonRows,
        0
      ),

    dataType:
      "forecast",
  };
}

// Lajittelee rivit aikaleiman perusteella.
function sortRowsByDate(
  rows
) {
  return [...rows].sort(
    (first, second) =>
      String(
        first.timestamp ??
          first.date ??
          ""
      ).localeCompare(
        String(
          second.timestamp ??
            second.date ??
            ""
        )
      )
  );
}

// Hakee toteutuneen tunti- ja henkilöstödatan.
async function fetchHourlyHistory(
  selectedLocation,
  startDate,
  endDateExclusive
) {
  if (
    !startDate ||
    !endDateExclusive ||
    startDate >=
      endDateExclusive
  ) {
    console.warn(
      "Virheellinen henkilöstödatan aikaväli:",
      {
        startDate,
        endDateExclusive,
      }
    );

    return [];
  }

  const finalDate =
    addDays(
      endDateExclusive,
      -1
    );

  const params = {
    start:
      toApiDate(startDate),

    end:
      toApiDate(finalDate),
  };

  if (
    !isAllLocationsSelected(
      selectedLocation
    )
  ) {
    params.location =
      selectedLocation;
  }

  const response =
    await API.get(
      "data/hourly/",
      {
        params,
      }
    );

  return getResponseRows(
    response.data
  );
}

// Hakee backendin historialliseen dataan perustuvan henkilöstöennusteen.
async function fetchEmployeePrediction(
  selectedLocation,
  forecastRange,
  startDate,
  endDateExclusive
) {
  if (
    !startDate ||
    !endDateExclusive ||
    startDate >=
      endDateExclusive
  ) {
    return [];
  }

  if (
    isAllLocationsSelected(
      selectedLocation
    )
  ) {
    throw new Error(
      "Valitse henkilöstöennustetta varten yksi toimipiste."
    );
  }

  const params = {
    days:
      getForecastDays(
        forecastRange
      ),

    location:
      selectedLocation,
  };

  const response =
    await API.get(
      "predict/employees/",
      {
        params,
      }
    );

  return getResponseRows(
    response.data
  ).filter((row) =>
    rowIsWithinRange(
      row,
      startDate,
      endDateExclusive
    )
  );
}

// Hakee ja muotoilee henkilöstönäkymän datan.
// Hakee ja muotoilee henkilöstönäkymän datan.
async function fetchEmployeesTimelineData(filters) {
  const selectedLocation =
    filters.selectedLocation;

  const visibleStart =
    getVisibleStartDate(filters);

  const visibleEndExclusive =
    getVisibleEndDateExclusive(filters);

  const forecastMode =
    isForecastMode(filters.mode);

  if (!forecastMode) {
    const historyRows =
      await fetchHourlyHistory(
        selectedLocation,
        visibleStart,
        visibleEndExclusive
      );

    console.log(
      "Toteutuneet henkilöstörivit API:sta:",
      historyRows
    );

    const mappedRows =
      historyRows.map(mapHistoryRow);

    console.log(
    "ENSIMMÄINEN ALKUPERÄINEN RIVI:",
    historyRows[0]
    );

    console.log(
    "ENSIMMÄINEN MUOTOILTU RIVI:",
    mappedRows[0]
    );

    console.log(
    "MUOTOILLUN RIVIN AVAIMET:",
    Object.keys(mappedRows[0] || {})
    );

    console.log(
    "MUOTOILLUN RIVIN JSON:",
    JSON.stringify(
        mappedRows[0],
        null,
        2
    )
    );

    return sortRowsByDate(mappedRows);
  }

  const predictionRows =
    await fetchEmployeePrediction(
      selectedLocation,
      filters.forecastRange,
      visibleStart,
      visibleEndExclusive
    );

  return sortRowsByDate(
    predictionRows.map(mapPredictionRow)
  );
}

// Palauttaa API-virheestä käyttöliittymässä näytettävän viestin.
function getRequestErrorMessage(
  requestError
) {
  const responseData =
    requestError.response?.data;

  if (
    typeof responseData ===
    "string"
  ) {
    return responseData;
  }

  return (
    responseData?.detail ??
    responseData?.error ??
    requestError.message ??
    "Henkilöstödatan haku epäonnistui."
  );
}

// Hakee henkilöstödatan aina aktiivisten suodattimien muuttuessa.
export function useEmployeesData(
  filters
) {
  const [data, setData] =
    useState([]);

  const [error, setError] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (
      !filters?.hasApplied
    ) {
      setData([]);
      setError(null);
      setLoading(false);

      return undefined;
    }

    let cancelled = false;

    // Hakee suodattimia vastaavan henkilöstödatan.
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const rows =
          await fetchEmployeesTimelineData(
            filters
          );

        if (!cancelled) {
          setData(rows);
        }
      } catch (
        requestError
      ) {
        console.error(
          "Henkilöstödatan haku epäonnistui:",
          requestError.response
            ?.data ??
            requestError
        );

        if (!cancelled) {
          setData([]);

          setError(
            getRequestErrorMessage(
              requestError
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    filters?.hasApplied,
    filters?.mode,
    filters
      ?.selectedLocation,
    filters?.forecastRange,
    filters?.dateRange
      ?.startDate,
    filters?.dateRange
      ?.endDate,
    filters?.dateRange
      ?.endDateExclusive,
  ]);

  return {
    data,
    loading,
    error,
  };
}

export default useEmployeesData;