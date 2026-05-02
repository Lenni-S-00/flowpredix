/* yläpalkin sisältö */

import "./topbar.css";

function Topbar({ title }) {
  return (
    <div className="topbar">
      <h2>{title}</h2>
    </div>
  );
}

export default Topbar;