/* yhteenveto välilehti */

import Topbar from "./topbar.jsx";

function Summary() {
  return (
    <>
      <Topbar title="Yhteenveto" />

      <div className="page-content">
        <p>Tähän tulee yhteenveto (esim. tilastot, grafit jne).</p>
      </div>
    </>
  );
}

export default Summary;