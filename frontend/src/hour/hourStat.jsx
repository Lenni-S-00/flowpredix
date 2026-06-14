import "./hourStat.css";

const OPEN_HOURS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
];

function getHourLabel(item) {
  if (!item.hour) return "";

  return item.hour.includes("T")
    ? item.hour.slice(11, 16)
    : item.hour.slice(0, 5);
}

function HourStat({ data, valueKey = "realized" }) {
  const openHourData = (data || []).filter((item) =>
    OPEN_HOURS.includes(getHourLabel(item))
  );

  if (openHourData.length === 0) return null;

  const totalPatients = openHourData.reduce(
    (sum, item) => sum + item[valueKey],
    0
  );

  const values = openHourData.map((item) => item[valueKey]);

  const averagePatients = Math.round(totalPatients / openHourData.length);
  const maxPatients = Math.max(...values);
  const minPatients = Math.min(...values);

  const busiestHour = openHourData.reduce((max, item) =>
    item[valueKey] > max[valueKey] ? item : max
  );

  const quietestHour = openHourData.reduce((min, item) =>
    item[valueKey] < min[valueKey] ? item : min
  );

  const formatDateTime = (item) => {
    const date = new Date(item.date);
    const hour = getHourLabel(item);

    const formattedDate = date.toLocaleDateString("fi-FI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return `${formattedDate} klo ${hour}`;
  };

  return (
    <section className="hour-stat-card">
      <div className="hour-stat-header">
        <h2>Tilastot</h2>
        <span>Potilasmäärät valitulla aikavälillä</span>
      </div>

      <div className="hour-stat-grid">
        <div className="hour-stat-box">
          <span className="hour-stat-label">Yhteensä</span>
          <strong>{totalPatients}</strong>
          <span className="hour-stat-small">potilasta</span>
        </div>

        <div className="hour-stat-box">
          <span className="hour-stat-label">Keskiarvo</span>
          <strong>{averagePatients}</strong>
          <span className="hour-stat-small">potilasta / tunti</span>
        </div>

        <div className="hour-stat-box">
          <span className="hour-stat-label">Vilkkain tunti</span>
          <strong>{maxPatients}</strong>
          <span className="hour-stat-small">{formatDateTime(busiestHour)}</span>
        </div>

        <div className="hour-stat-box">
          <span className="hour-stat-label">Hiljaisin tunti</span>
          <strong>{minPatients}</strong>
          <span className="hour-stat-small">
            {formatDateTime(quietestHour)}
          </span>
        </div>
      </div>
    </section>
  );
}

export default HourStat;