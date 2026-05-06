// dashboard/dashboard.jsx
import DayFilter from "./dayFilter";
import "./day.css";

function Day() {
  return (
    <div className="day-page">
      <DayFilter />

      <div className="day-content">
        Tähän tulee dashboard sisältöä myöhemmin.
      </div>
    </div>
  );
}

export default Day;