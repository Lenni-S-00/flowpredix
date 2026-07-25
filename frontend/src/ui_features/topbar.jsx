import "./topbar.css";

function Topbar({ activeTab, setActiveTab }) {
const tabs = [
  {
    id: "summary",
    label: "Yhteenveto",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16">
        <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },

  {
    id: "daily",
    label: "Päivätaso",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16">
        <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
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
            src="/fp_logo_background.png"
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
      </div>
    </header>
  );
}

export default Topbar;