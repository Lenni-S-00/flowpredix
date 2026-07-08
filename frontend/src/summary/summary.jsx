import { useState } from "react";
import Sidebar from "../sidebar/sidebar";
import SummaryFilter from "./summaryFilter";
import SummaryMain from "./summaryMain";

function Summary() {
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
      <Sidebar title="Yhteenvedon suodattimet">
        <SummaryFilter onApply={setFilters} />
      </Sidebar>

      <SummaryMain filters={filters} />
    </>
  );
}

export default Summary;