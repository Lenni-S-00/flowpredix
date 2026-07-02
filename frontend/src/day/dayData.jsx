import { useState, useEffect } from "react";
import API from "../api";

// päivämäärän muunnos oikeaan muotoon
function toApiDate(value) {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  // padStart = täydentää merkkijonon alkuun merkkejä, kunnes se on halutun pituinen
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// haetaan tarvittava data backendistä graafille aina kun suodattimet muuttuu
export function useRealData(filters) {
  const [data, setData] = useState([]);

  // jos käyttäjä ei paina "näytä"-nappia fillterissä, ei tehdä api-kutsua
  useEffect(() => {
    if (!filters?.hasApplied) {
      setData([]);
      return;
    }

    // haetaan data filttereiden mukaan
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

    // lähetetään get-pyyntö, axios muodostaa url:n automaattisesti
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