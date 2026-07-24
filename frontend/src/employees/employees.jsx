import { useState } from "react";
import Sidebar from "../sidebar/sidebar.jsx";
import EmployeesFilter from "./employeesFilter.jsx";
import EmployeesMain from "./employeesMain.jsx";
import "./employees.css";

function Employees() {
  const [filters, setFilters] = useState({
    mode: "realized",
    selectedLocation: "",
    forecastRange: "24 tuntia",
    hasApplied: false,
    dateRange: {
      startDate: null,
      endDate: null,
      endDateExclusive: null,
    },
  });

  return (
    <div className="employees">
      <Sidebar title="Henkilöstön suodattimet">
        <EmployeesFilter onSubmit={setFilters} />
      </Sidebar>

      <EmployeesMain filters={filters} />
    </div>
  );
}

export default Employees;