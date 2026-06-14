import "./dayStat.css";

function DayStat({ data, valueKey = "realized" }) {
  if (!data || data.length === 0) return null;

  const totalPatients = data.reduce((sum, item) => sum + item[valueKey], 0);

  const values = data.map((item) => item[valueKey]);
  const averagePatients = Math.round(totalPatients / data.length);
  const maxPatients = Math.max(...values);
  const minPatients = Math.min(...values);

  const busiestDay = data.reduce((max, item) =>
    item[valueKey] > max[valueKey] ? item : max
  );

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
          <span className="day-stat-small">{formatDate(busiestDay.date)}</span>
        </div>

        <div className="day-stat-box">
          <span className="day-stat-label">Pienin päivä</span>
          <strong>{minPatients}</strong>
          <span className="day-stat-small">potilasta</span>
        </div>
      </div>
    </section>
  );
}

export default DayStat;