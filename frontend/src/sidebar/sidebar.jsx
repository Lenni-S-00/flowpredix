import "./sidebar.css";

function Sidebar({ title = "Suodattimet", children }) {
  return (
    <aside className="filter-sidebar">
      <div className="filter-sidebar-card">
        <div className="filter-sidebar-header">
          <h3>{title}</h3>
        </div>

        <div className="filter-sidebar-content">
          {children}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;