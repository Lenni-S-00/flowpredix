/* yhteenveto välilehti */

import Topbar from "../topbar.jsx";
import HourFilter from "./hourFilter.jsx";

function Hour() {
  return (
    <>
      <div className="hour">
        <HourFilter />

        <p>Tähän tulee yhteenveto (esim. tilastot, grafit jne).</p>
      </div>
    </>
  );
}

export default Hour;
