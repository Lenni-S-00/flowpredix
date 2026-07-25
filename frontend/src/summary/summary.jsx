import { useState } from "react";

import Sidebar from "../sidebar/sidebar";
import SummaryFilter from "./summaryFilter";
import SummaryMain from "./summaryMain";

function createSummaryFilters(
  selectedLocation,
  hasApplied = false
) {
  return {
    selectedLocations: [
      selectedLocation ||
        "Kaikki näytteenotot",
    ],
    hasApplied,
  };
}

function Summary() {
  const [filters, setFilters] = useState(() =>
    createSummaryFilters(
      "Kaikki näytteenotot",
      false
    )
  );

  function handleApply(newFilters) {
    setFilters(
      createSummaryFilters(
        newFilters.selectedLocation,
        true
      )
    );
  }

  return (
    <>
      <Sidebar title="Yhteenvedon suodattimet">
        <SummaryFilter
          initialLocation={
            filters.selectedLocations?.[0]
          }
          onApply={handleApply}
        />
      </Sidebar>

      <SummaryMain filters={filters} />
    </>
  );
}

export default Summary;