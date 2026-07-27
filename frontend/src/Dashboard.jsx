import { useState } from "react";

import "./App.css";
import "./loginout.css";

import Topbar from "./ui_features/topbar";
import Summary from "./summary/summary";
import Day from "./day/day";
import Hour from "./hour/hour";
import Employees from "./employees/employees";
import Data from "./data/data";

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div className="app">
      <Topbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        <div
          style={{
            display:
              activeTab === "summary" ? "block" : "none",
          }}
        >
          <Summary />
        </div>

        <div
          style={{
            display:
              activeTab === "daily" ? "block" : "none",
          }}
        >
          <Day />
        </div>

        <div
          style={{
            display:
              activeTab === "hour" ? "block" : "none",
          }}
        >
          <Hour />
        </div>

        <div
          style={{
            display:
              activeTab === "employees" ? "block" : "none",
          }}
        >
          <Employees />
        </div>

        <div
          style={{
            display:
              activeTab === "data" ? "block" : "none",
          }}
        >
          <Data />
        </div>
      </main>

      <button
        type="button"
        className="logout-button"
        onClick={onLogout}
      >
        Kirjaudu ulos
      </button>
    </div>
  );
}