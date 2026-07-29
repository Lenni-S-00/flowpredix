import { useState } from "react";
import "./sidebar.css";

function Sidebar({
  title = "Suodattimet",
  children,
  defaultOpen = true,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="sidebar-open-button"
          onClick={() => setIsOpen(true)}
          aria-label="Avaa suodattimet"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <line
              x1="4"
              y1="7"
              x2="20"
              y2="7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="9" cy="7" r="2" fill="currentColor" />

            <line
              x1="4"
              y1="12"
              x2="20"
              y2="12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="15" cy="12" r="2" fill="currentColor" />

            <line
              x1="4"
              y1="17"
              x2="20"
              y2="17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="11" cy="17" r="2" fill="currentColor" />
          </svg>
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