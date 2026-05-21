import { useState } from "react";
import Sidebar from "../sidebar/sidebar.jsx";
import HourFilter from "./hourFilter.jsx";
import HourMain from "./hourMain.jsx";
import "./hour.css";

function Hour() {
  const [filters, setFilters] = useState({
    mode: "realized",
    selectedLocation: "",
    forecastRange: "2 viikkoa",
    dateRange: {
      startDate: null,
      endDate: null,
    },
  });

  return (
    <div className="hour">
      <Sidebar title="Tunnin suodattimet">
        <HourFilter onSubmit={setFilters} />
      </Sidebar>

      <HourMain filters={filters} />
    </div>
  );
}

export default Hour;