import "./dayStat.css";

function DayStat({ data, valueKey = "realized" }) {
  if (!data || data.length === 0) return null;

  // Yhdistää saman päivän eri toimipisteiden arvot.
  const dailyTotals = Object.values(
    data.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {
          date: item.date,
          value: 0,
        };
      }

      acc[item.date].value += item[valueKey];

      return acc;
    }, {})
  );

  // Käytetään päiväkohtaisia summia vain jos mukana on useampi toimipiste.
  const multipleLocations =
    new Set(data.map((item) => item.location)).size > 1;

  const statsSource = multipleLocations
    ? dailyTotals
    : data.map((item) => ({
        date: item.date,
        value: item[valueKey],
      }));

  const totalPatients = statsSource.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const averagePatients = Math.round(
    totalPatients / statsSource.length
  );

  const maxDay = statsSource.reduce((max, item) =>
    item.value > max.value ? item : max
  );

  const minDay = statsSource.reduce((min, item) =>
    item.value < min.value ? item : min
  );

  const maxPatients = maxDay.value;
  const minPatients = minDay.value;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  return (
    <section className="day-stat-card">
      <div className="day-stat-header">
        <h2>Tilastot</h2>
        <span>Potilasmäärät valitulla aikavälillä</span>
      </div>

      <div className="day-stat-grid">
        <div className="day-stat-box">
          <span className="day-stat-label">Yhteensä</span>
          <strong>{totalPatients}</strong>
          <span className="day-stat-small">potilasta</span>
        </div>

        <div className="day-stat-box">
          <span className="day-stat-label">Keskiarvo</span>
          <strong>{averagePatients}</strong>
          <span className="day-stat-small">potilasta / päivä</span>
        </div>

        <div className="day-stat-box">
          <span className="day-stat-label">Suurin päivä</span>
          <strong>{maxPatients}</strong>
          <span className="day-stat-small">{formatDate(maxDay.date)}</span>
        </div>

        <div className="day-stat-box">
          <span className="day-stat-label">Pienin päivä</span>
          <strong>{minPatients}</strong>
          <span className="day-stat-small">{formatDate(minDay.date)}</span>
        </div>
      </div>
    </section>
  );
}

export default DayStat;