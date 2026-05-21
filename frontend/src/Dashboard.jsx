import "./App.css";
import Topbar from "./topbar";
import Day from "./day/day";
import DayFilter from "./day/dayFilter";
import "./loginout.css";
import Data from "./data/data";
import Hour from "./hour/hour";
import Employees from "./employees";
import { useState } from "react";

// Tää vois olla jossain toisessa paikassa.
const logout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.location.reload();
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("daily");

  return (
    <div className="app">
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {activeTab === "daily" && <Day />}
        {activeTab === "hour" && <Hour />}
        {activeTab === "employees" && <Employees />}
        {activeTab === "data" && <Data />}
      </main>
      <button className="logout-button" onClick={logout}>Logout</button>
    </div>
  );
}