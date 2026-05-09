import { useState } from "react";
import "./sidebar.css";

function Sidebar({ title = "Suodattimet", children }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="sidebar-open-button"
          onClick={() => setIsOpen(true)}
        >
          ☰
        </button>
      )}

      <aside className={`filter-sidebar ${!isOpen ? "closed" : ""}`}>
        <div className="filter-sidebar-card">
          <div className="filter-sidebar-header">
            <h3>{title}</h3>

            <button
              type="button"
              className="sidebar-close-button"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="filter-sidebar-content">
            {children}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;