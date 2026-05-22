import { useState } from "react";
import Sidebar from "../sidebar/sidebar";
import DayFilter from "./dayFilter";
import DayMain from "./dayMain";

function Day() {
  const [filters, setFilters] = useState({
    mode: "forecast",
    selectedLocations: ["Kaikki toimipisteet"],
    dateRange: {
      startDate: null,
      endDate: null,
    },
    forecastRange: "6 kuukautta",
  });

  return (
    <>
      <Sidebar title="Päivän suodattimet">
        <DayFilter onApply={setFilters} />
      </Sidebar>

      <DayMain filters={filters} />
    </>
  );
}

export default Day;