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

function startOfDay(value) {
  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(value);

  date.setHours(0, 0, 0, 0);

  return date;
}

function addDays(value, amount) {
  const date = startOfDay(value);

  date.setDate(
    date.getDate() + amount
  );

  return date;
}

function getDaysBetween(
  start,
  endExclusive
) {
  return Math.max(
    0,
    Math.round(
      (
        startOfDay(endExclusive) -
        startOfDay(start)
      ) /
        (24 * 60 * 60 * 1000)
    )
  );
}

function toApiDate(value) {
  if (!value) return undefined;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

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

function getVisibleStartDate(
  filters
) {
  if (
    filters.mode === "forecast"
  ) {
    return startOfDay(
      new Date()
    );
  }

  return startOfDay(
    filters.dateRange
      ?.startDate || new Date()
  );
}

function getVisibleEndDateExclusive(
  filters
) {
  if (
    filters.mode === "forecast"
  ) {
    const days =
      FORECAST_DAYS[
        filters.forecastRange
      ] || 1;

    return addDays(
      new Date(),
      days
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
    filters.dateRange?.endDate
  ) {
    return addDays(
      filters.dateRange.endDate,
      1
    );
  }

  return addDays(
    getVisibleStartDate(filters),
    1
  );
}

function getHourlyRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.results)) {
    return responseData.results;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.hourly_data)) {
    return responseData.hourly_data;
  }

  if (Array.isArray(responseData?.rows)) {
    return responseData.rows;
  }

  console.warn(
    "Tuntidatan vastausta ei tunnistettu:",
    responseData
  );

  return [];
}

function getPredictionRows(
  responseData
) {
  if (
    Array.isArray(responseData)
  ) {
    return responseData;
  }

  return (
    responseData?.predictions ||
    []
  );
}

function getRowTimestamp(row) {
  if (!row) return null;

  return (
    row.hour_timestamp ||
    row.timestamp ||
    row.datetime ||
    row.date_time ||
    row.date ||
    (
      typeof row.hour === "string" &&
      row.hour.includes("T")
        ? row.hour
        : null
    )
  );
}

function getRowHour(row) {
  if (!row) return null;

  if (
    typeof row.hour === "number" &&
    Number.isFinite(row.hour)
  ) {
    return row.hour;
  }

  if (
    typeof row.hour === "string" &&
    /^\d{1,2}$/.test(row.hour)
  ) {
    return Number(row.hour);
  }

  if (
    typeof row.hour === "string" &&
    /^\d{1,2}:\d{2}/.test(row.hour)
  ) {
    return Number(
      row.hour.split(":")[0]
    );
  }

  const rawTimestamp =
    row.hour_timestamp ||
    row.timestamp ||
    row.datetime ||
    row.date_time ||
    (
      typeof row.hour === "string"
        ? row.hour
        : null
    );

  if (
    typeof rawTimestamp !== "string"
  ) {
    return null;
  }

  const match = rawTimestamp.match(
    /[T\s](\d{1,2}):/
  );

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);

  return Number.isFinite(hour)
    ? hour
    : null;
}  

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
    timestamp < endDateExclusive
  );
}

function mapHistoryRow(row) {
  const timestamp =
    getRowTimestamp(row);

  const hour =
    getRowHour(row);

  const rawValue =
    row.realized ??
    row.samples_taken ??
    row.total_samples ??
    row.samples ??
    row.sample_count ??
    row.patient_count ??
    row.count ??
    row.value ??
    0;

  const value =
    Number(rawValue);

  return {
    ...row,

    // Alkuperäinen aikaleima säilytetään.
    date:
      timestamp ||
      row.date ||
      null,

    timestamp:
      timestamp ||
      row.date ||
      null,

    hour,

    realized:
      Number.isFinite(value)
        ? value
        : 0,

    forecast:
      Number.isFinite(value)
        ? value
        : 0,

    dataType: "realized",
  };
}

function mapPredictionRow(row) {
  const timestamp =
    getRowTimestamp(row);

  const hour =
    getRowHour(row);

  const value = Number(
    row.forecast ??
      row.prediction ??
      row
        .predicted_patient_count ??
      row.predicted_samples ??
      row
        .predicted_samples_taken ??
      row.predicted_value ??
      row.value ??
      0
  );

  return {
    ...row,
    date: timestamp,
    timestamp,
    hour,
    realized: Number.isFinite(
      value
    )
      ? value
      : 0,
    forecast: Number.isFinite(
      value
    )
      ? value
      : 0,
    dataType: "forecast",
  };
}

async function fetchHourlyHistory(
  selectedLocation,
  startDate,
  endDateExclusive
) {
  if (
    !startDate ||
    !endDateExclusive ||
    startDate >= endDateExclusive
  ) {
    console.warn(
      "Virheellinen tuntidatan aikaväli:",
      {
        startDate,
        endDateExclusive,
      }
    );

    return [];
  }

  const params = {
    start: toApiDate(startDate),
    end: toApiDate(
      addDays(
        endDateExclusive,
        -1
      )
    ),
  };

  if (
    !isAllLocationsSelected(
      selectedLocation
    )
  ) {
    params.location =
      selectedLocation;
  }

  console.log(
    "Toteutuneen tuntidatan haku:",
    params
  );

  const response = await API.get(
    "data/hourly/",
    {
      params,
    }
  );

  console.log(
    "Toteutuneen tuntidatan raakavastaus:",
    response.data
  );

  const rows =
    getHourlyRows(
      response.data
    );

  console.log(
    "Tunnistetut tuntirivit:",
    rows
  );

  return rows;
}
async function fetchHourlyPrediction(
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
    return [];
  }

  const today =
    startOfDay(
      new Date()
    );

  const days = Math.max(
    1,
    getDaysBetween(
      today,
      endDateExclusive
    )
  );

  const params = {
    days,
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
      "predict/hourly/",
      {
        params,
      }
    );

  return getPredictionRows(
    response.data
  ).filter((row) =>
    rowIsWithinRange(
      row,
      startDate,
      endDateExclusive
    )
  );
}

async function fetchHourTimelineData(
  filters
) {
  const selectedLocation =
    filters.selectedLocation;

  const visibleStart =
    getVisibleStartDate(
      filters
    );

  const visibleEndExclusive =
    getVisibleEndDateExclusive(
      filters
    );

  if (
    filters.mode ===
    "realized"
  ) {
    const historyRows =
      await fetchHourlyHistory(
        selectedLocation,
        visibleStart,
        visibleEndExclusive
      );

    return historyRows
      .map(mapHistoryRow)
      .sort((a, b) =>
        String(a.date).localeCompare(
          String(b.date)
        )
      );
  }

  const predictionRows =
    await fetchHourlyPrediction(
      selectedLocation,
      visibleStart,
      visibleEndExclusive
    );

  return predictionRows
    .map(mapPredictionRow)
    .sort((a, b) =>
      String(a.date).localeCompare(
        String(b.date)
      )
    );
}

export function useHourData(
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
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const rows =
          await fetchHourTimelineData(
            filters
          );

        if (!cancelled) {
          setData(rows);
        }
      } catch (
        requestError
      ) {
        console.error(
          "Tuntidatan haku epäonnistui:",
          requestError.response
            ?.data ||
            requestError
        );

        if (!cancelled) {
          setData([]);

          setError(
            requestError.response
              ?.data?.detail ||
              "Tuntidatan haku epäonnistui."
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