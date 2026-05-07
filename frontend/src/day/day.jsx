import Sidebar from "../sidebar/sidebar";
import DayFilter from "./dayFilter";

function Day() {
  return (
    <>
      <Sidebar title="Päivän suodattimet">
        <DayFilter />
      </Sidebar>

      <div>
        sivun sisältö
      </div>
    </>
  );
}

export default Day;