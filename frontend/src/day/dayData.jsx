import { useState, useEffect } from "react";
import API from "../api";

function toApiDate(value) {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // mikä on padstart?
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function useRealData(filters) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!filters?.hasApplied) {
      setData([]);
      return;
    }

    const selectedLocations = filters.selectedLocations || [];

    const allSelected =
      selectedLocations.length === 0 ||
      selectedLocations.includes("Kaikki näytteenotot");

    const params = {
      start: toApiDate(filters.dateRange?.startDate),
      end: toApiDate(filters.dateRange?.endDate),
    };

    if (!allSelected) {
      params.locations = selectedLocations.join(",");
    }

    API.get("data/summary/", { params })
      .then((res) => {
        console.log("Summary data:", res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error("Yhteenvetodatan haku epäonnistui:", err.response?.data || err);
      });
  }, [filters]);

  return data;
}