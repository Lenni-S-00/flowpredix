import { useState } from "react";
import Sidebar from "../sidebar/sidebar";
import DayFilter from "./dayFilter";
import DayMain from "./dayMain";

function Day() {
  const [filters, setFilters] = useState({
    mode: "realized",
    selectedLocations: [],
    dateRange: {
      startDate: null,
      endDate: null,
    },
    forecastRange: "2 viikkoa",
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