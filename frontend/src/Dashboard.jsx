import "./App.css";
import Topbar from "./topbar";
import Day from "./day/day";
import "./loginout.css";
import Data from "./data/data";
import Hour from "./hour/hour";
import Employees from "./employees";
import { useState } from "react";

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
        <div style={{ display: activeTab === "daily" ? "block" : "none" }}>
          <Day />
        </div>

        <div style={{ display: activeTab === "hour" ? "block" : "none" }}>
          <Hour />
        </div>

        <div style={{ display: activeTab === "employees" ? "block" : "none" }}>
          <Employees />
        </div>

        <div style={{ display: activeTab === "data" ? "block" : "none" }}>
          <Data />
        </div>
      </main>

      <button className="logout-button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}