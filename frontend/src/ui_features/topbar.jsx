import { useEffect, useRef, useState } from "react";
import "./topbar.css";

function Topbar({ activeTab, setActiveTab, onLogout }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
const tabs = [
  {
    id: "summary",
    label: "Yhteenveto",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16">
        <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="2"/>
        <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2"/>
        <line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },

  {
    id: "daily",
    label: "Päivätaso",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16">
        <polyline
          points="4,16 9,11 13,14 20,7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="16" r="1.5" fill="currentColor"/>
        <circle cx="9" cy="11" r="1.5" fill="currentColor"/>
        <circle cx="13" cy="14" r="1.5" fill="currentColor"/>
        <circle cx="20" cy="7" r="1.5" fill="currentColor"/>
      </svg>
    )
  },

  {
    id: "hour",
    label: "Tuntitaso",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="12" y1="7" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
        <line x1="12" y1="12" x2="16" y2="14" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  {
    id: "employees",
    label: "Henkilöstö",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16">
        <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5" fill="none" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  }, /*
  {
    id: "demographics",
    label: "Demografia",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M12 3v9l7 4" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  }, */
  {
    id: "data",
    label: "Tuonti",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M12 3v12" stroke="currentColor" strokeWidth="2"/>
        <path d="M7 8l5-5 5 5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="4" y="15" width="16" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  }
];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-logo">
          <img
            src="/fp_logo3.png"
            alt="FlowPredictor"
            className="topbar-logo-image"
          />
        </div>

        <nav className="topbar-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`topbar-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>


        <div className="topbar-user" ref={userMenuRef}>
          <button
            type="button"
            className={`topbar-user-button ${
              activeTab === "profile" ? "active" : ""
            }`}
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-label="Käyttäjävalikko"
            aria-expanded={userMenuOpen}
          >
            <svg
              viewBox="0 0 24 24"
              width="21"
              height="21"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="8"
                r="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="topbar-user-menu">
              <button
                type="button"
                className="topbar-user-menu-item"
                onClick={() => {
                  setActiveTab("profile");
                  setUserMenuOpen(false);
                }}
              >
                Oma profiili
              </button>

              <div className="topbar-user-menu-divider" />

              <button
                type="button"
                className="topbar-user-menu-item logout"
                onClick={() => {
                  setUserMenuOpen(false);
                  onLogout();
                }}
              >
                Kirjaudu ulos
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;