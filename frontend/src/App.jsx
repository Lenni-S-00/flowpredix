// App.jsx
import "./App.css";
import Topbar from "./topbar";
import Day from "./day/day";
import DayFilter from "./day/dayFilter";

import Data from "./data/data";
import Hour from "./hour/hour";
import Employees from "./employees";
import { useState } from "react";

export default function App() {
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
    </div>
  );
}