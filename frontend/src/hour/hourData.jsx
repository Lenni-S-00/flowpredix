import { useState, useEffect } from "react";
import API from "../api";

function toApiDate(value) {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function useHourData(filters) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!filters) {
      setData([]);
      return;
    }

    const selectedLocation = filters.selectedLocation;

    const params = {
      start: toApiDate(filters.dateRange?.startDate),
      end: toApiDate(filters.dateRange?.endDate),
    };

    if (
      selectedLocation &&
      selectedLocation !== "Kaikki toimipisteet"
    ) {
      params.locations = selectedLocation;
    }

    API.get("data/hourly/", { params })
      .then((res) => {
        console.log("Hourly data:", res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error(
          "Tuntidatan haku epäonnistui:",
          err.response?.data || err
        );
      });
  }, [filters]);

  return data;
}