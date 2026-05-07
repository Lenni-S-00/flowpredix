/* yhteenveto välilehti */
import Sidebar from "../sidebar/sidebar.jsx";
import Topbar from "../topbar.jsx";
import HourFilter from "./hourFilter.jsx";

function Hour() {
  return (
    <>
      <div className="hour">
      <Sidebar title="Tunnin suodattimet">
        <HourFilter />
      </Sidebar>

        <p>Tähän tulee yhteenveto (esim. tilastot, grafit jne).</p>
      </div>
    </>
  );
}

export default Hour;
