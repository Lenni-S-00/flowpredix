/* kokoaa nettisivun rakenteen yhteen */

import { useState } from "react";
import "./App.css";

import Sidebar from "./sidebar.jsx";
import Dashboard from "./dashboard/dashboard.jsx";
import Summary from "./summary.jsx";
import AddFile from "./addfile.jsx";
import Employees from "./employees.jsx";
import Demographics from "./demographics.jsx";

function App() {
  const [view, setView] = useState("home");

  return (
    <div className="app-container">
      <Sidebar setView={setView} activeView={view} />

      <div className="content">
        {view === "home" && <Dashboard />}
        {view === "summary" && <Summary />}
        {view === "employees" && <Employees />}
        {view === "demographics" && <Demographics />}
        {view === "add" && <AddFile />}
      </div>
    </div>
  );
}

export default App;