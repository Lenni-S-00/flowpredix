/* työntekijä välilehti */

import Topbar from "./topbar.jsx";

function Employees() {
  return (
    <>
      <Topbar title="Työntekijöiden määrä" />

      <div className="page-content">
        <p>Tähän tulee työntekijöiden määrä</p>
      </div>
    </>
  );
}

export default Employees;