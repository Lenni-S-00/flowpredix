import "./employeesStat.css";

const HOURS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
];

// Muuntaa arvon turvallisesti numeroksi.
function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

// Palauttaa datarivin aikaleiman.
function getRowTimestamp(item) {
  return (
    item.hour_timestamp ||
    item.timestamp ||
    item.datetime ||
    item.date_time ||
    item.date ||
    null
  );
}

// Palauttaa datarivin tunnin numerona.
function getRowHour(item) {
  if (
    typeof item.hour === "number" &&
    Number.isFinite(item.hour)
  ) {
    return item.hour;
  }

  if (
    typeof item.hour === "string" &&
    /^\d{1,2}$/.test(item.hour)
  ) {
    return Number(item.hour);
  }

  if (
    typeof item.hour === "string" &&
    /^\d{1,2}:\d{2}/.test(item.hour)
  ) {
    return Number(
      item.hour.split(":")[0]
    );
  }

  const timestamp =
    getRowTimestamp(item);

  if (
    typeof timestamp !== "string"
  ) {
    return null;
  }

  const match = timestamp.match(
    /[T\s](\d{1,2}):/
  );

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);

  return Number.isFinite(hour)
    ? hour
    : null;
}

// Muotoilee tunnin HH:00-muotoon.
function formatHour(hour) {
  if (
    hour === null ||
    hour === undefined ||
    !Number.isFinite(hour)
  ) {
    return "–";
  }

  return `${String(hour).padStart(
    2,
    "0"
  )}:00`;
}

// Muotoilee päivämäärän suomalaisessa muodossa.
function formatDate(value) {
  if (!value) {
    return "–";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "–";
  }

  return date.toLocaleDateString(
    "fi-FI",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

// Palauttaa riviltä tilastoissa käytettävän henkilöstömäärän.
function getEmployeeValue(
  item,
  valueKey
) {
  return toNumber(
    item[valueKey] ??
      item.employeeValue ??
      item.recommendedEmployees ??
      item.recommended_employees ??
      item.requiredEmployees ??
      item.required_employees ??
      item.forecastEmployees ??
      item.forecast_employees ??
      item.realizedEmployees ??
      item.realized_employees ??
      item.employees_used ??
      item.total_employees ??
      item.employees
  );
}

// Palauttaa vain varsinaisiin aukiolotunteihin kuuluvat rivit.
function getBusinessHourRows(data) {
  return data.filter((item) => {
    const hour = getRowHour(item);

    if (
      hour === null ||
      !Number.isFinite(hour)
    ) {
      return false;
    }

    return HOURS.includes(
      formatHour(hour)
    );
  });
}

// Laskee henkilöstömäärien summan.
function calculateTotalEmployees(
  values
) {
  return values.reduce(
    (sum, value) =>
      sum + value,
    0
  );
}

// Laskee henkilöstömäärän keskiarvon.
function calculateAverageEmployees(
  values
) {
  if (values.length === 0) {
    return 0;
  }

  return (
    calculateTotalEmployees(
      values
    ) / values.length
  );
}

// Etsii suurimman henkilöstötarpeen rivin.
function findPeakRow(
  rows,
  valueKey
) {
  if (rows.length === 0) {
    return null;
  }

  return rows.reduce(
    (largest, current) => {
      const largestValue =
        getEmployeeValue(
          largest,
          valueKey
        );

      const currentValue =
        getEmployeeValue(
          current,
          valueKey
        );

      return currentValue >
        largestValue
        ? current
        : largest;
    }
  );
}

// Ryhmittelee henkilöstömäärät päivittäin.
function groupEmployeesByDate(
  rows,
  valueKey
) {
  const grouped = {};

  rows.forEach((item) => {
    const timestamp =
      getRowTimestamp(item);

    if (!timestamp) {
      return;
    }

    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return;
    }

    const dateKey = [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(2, "0"),
      String(
        date.getDate()
      ).padStart(2, "0"),
    ].join("-");

    grouped[dateKey] =
      (grouped[dateKey] || 0) +
      getEmployeeValue(
        item,
        valueKey
      );
  });

  return grouped;
}

// Etsii päivän, jolla henkilöstötunteja tarvitaan eniten.
function findBusiestDay(
  groupedDays
) {
  const entries =
    Object.entries(
      groupedDays
    );

  if (entries.length === 0) {
    return null;
  }

  return entries.reduce(
    (largest, current) =>
      current[1] > largest[1]
        ? current
        : largest
  );
}

// Näyttää henkilöstödatan keskeiset tunnusluvut.
function EmployeesStat({
  data,
  valueKey = "employeeValue",
  isForecast = false,
}) {
  if (
    !data ||
    data.length === 0
  ) {
    return (
      <section className="employees-stat-card">
        <h3 className="employees-stat-title">
          Tilastot
        </h3>

        <div className="employees-stat-empty">
          Tilastoja ei ole saatavilla.
        </div>
      </section>
    );
  }

  const businessHourRows =
    getBusinessHourRows(data);

  const rows =
    businessHourRows.length > 0
      ? businessHourRows
      : data;

  const values = rows.map(
    (item) =>
      getEmployeeValue(
        item,
        valueKey
      )
  );

  const nonZeroValues =
    values.filter(
      (value) => value > 0
    );

  const totalEmployees =
    calculateTotalEmployees(
      values
    );

  const averageEmployees =
    calculateAverageEmployees(
      nonZeroValues.length > 0
        ? nonZeroValues
        : values
    );

  const maxEmployees =
    values.length > 0
      ? Math.max(...values)
      : 0;

  const peakRow =
    findPeakRow(
      rows,
      valueKey
    );

  const peakHour =
    peakRow
      ? getRowHour(peakRow)
      : null;

  const peakDate =
    peakRow
      ? getRowTimestamp(
          peakRow
        )
      : null;

  const employeesByDate =
    groupEmployeesByDate(
      rows,
      valueKey
    );

  const busiestDay =
    findBusiestDay(
      employeesByDate
    );

  const busiestDayDate =
    busiestDay
      ? busiestDay[0]
      : null;

  const busiestDayHours =
    busiestDay
      ? busiestDay[1]
      : 0;

  return (
    <section className="employees-stat-card">
      <h3 className="employees-stat-title">
        Tilastot
      </h3>

      <div className="employees-stat-list">
        <div className="employees-stat-item">
          <span className="employees-stat-label">
            {isForecast
              ? "Suurin henkilöstötarve"
              : "Suurin henkilöstömäärä"}
          </span>

          <strong className="employees-stat-value">
            {maxEmployees}
          </strong>

          <span className="employees-stat-unit">
            työntekijää
          </span>
        </div>

        <div className="employees-stat-item">
          <span className="employees-stat-label">
            Keskimäärin tunnissa
          </span>

          <strong className="employees-stat-value">
            {averageEmployees.toFixed(
              1
            )}
          </strong>

          <span className="employees-stat-unit">
            työntekijää
          </span>
        </div>

        <div className="employees-stat-item">
          <span className="employees-stat-label">
            {isForecast
              ? "Suurimman tarpeen ajankohta"
              : "Suurimman määrän ajankohta"}
          </span>

          <strong className="employees-stat-value employees-stat-value-small">
            {formatHour(
              peakHour
            )}
          </strong>

          <span className="employees-stat-unit">
            {formatDate(
              peakDate
            )}
          </span>
        </div>

        <div className="employees-stat-item">
          <span className="employees-stat-label">
            Henkilöstötunnit yhteensä
          </span>

          <strong className="employees-stat-value">
            {totalEmployees}
          </strong>

          <span className="employees-stat-unit">
            henkilöstötuntia
          </span>
        </div>

        <div className="employees-stat-item">
          <span className="employees-stat-label">
            Eniten henkilöstötunteja
          </span>

          <strong className="employees-stat-value employees-stat-value-small">
            {formatDate(
              busiestDayDate
            )}
          </strong>

          <span className="employees-stat-unit">
            {busiestDayHours}{" "}
            henkilöstötuntia
          </span>
        </div>

        {isForecast && (
          <div className="employees-stat-info">
            Henkilöstötarve on arvioitu
            toimipisteen toteutuneen
            potilas- ja henkilöstödatan
            perusteella.
          </div>
        )}
      </div>
    </section>
  );
}

export default EmployeesStat;