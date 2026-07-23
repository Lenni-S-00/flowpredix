import "./hourStat.css";

const BUSINESS_HOURS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
];

function toDate(value) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getRowTimestamp(item) {
  return (
    item.timestamp ||
    item.date ||
    item.hour_timestamp ||
    item.datetime
  );
}

function getDateKey(item) {
  const date = toDate(
    getRowTimestamp(item)
  );

  if (!date) return null;

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const date = toDate(value);

  if (!date) return "–";

  return date.toLocaleDateString(
    "fi-FI",
    {
      weekday: "short",
      day: "numeric",
      month: "numeric",
    }
  );
}

function getHourLabel(item) {
  /*
   * Ennustedatassa:
   * hour: 7
   */
  if (
    typeof item.hour === "number" &&
    Number.isFinite(item.hour)
  ) {
    return `${String(item.hour).padStart(
      2,
      "0"
    )}:00`;
  }

  /*
   * Ennustedatassa mahdollisesti:
   * hour: "7"
   */
  if (
    typeof item.hour === "string" &&
    /^\d{1,2}$/.test(item.hour)
  ) {
    return `${item.hour.padStart(
      2,
      "0"
    )}:00`;
  }

  /*
   * Valmis kellonaika:
   * hour: "07:00"
   */
  if (
    typeof item.hour === "string" &&
    /^\d{1,2}:\d{2}$/.test(
      item.hour
    )
  ) {
    return item.hour.padStart(
      5,
      "0"
    );
  }

  /*
   * Aikaleima:
   * hour: "2026-07-23T07:00:00"
   */
  const date = toDate(
    item.hour ||
      getRowTimestamp(item)
  );

  if (!date) return null;

  return `${String(
    date.getHours()
  ).padStart(2, "0")}:00`;
}

function getValue(
  item,
  valueKey
) {
  const value = Number(
    item[valueKey] ??
      item.samples_taken ??
      item.prediction ??
      item.predicted_samples ??
      item.predicted_value ??
      item.value ??
      0
  );

  return Number.isFinite(value)
    ? value
    : 0;
}

function EmptyStat() {
  return (
    <aside className="hour-stat-card">
      <h3>Tilastot</h3>

      <div className="hour-stat-empty">
        Ei tilastotietoja
      </div>
    </aside>
  );
}

function StatItem({
  label,
  value,
  detail,
}) {
  return (
    <div className="hour-stat-item">
      <span className="hour-stat-label">
        {label}
      </span>

      <strong className="hour-stat-value">
        {value}
      </strong>

      {detail && (
        <span className="hour-stat-detail">
          {detail}
        </span>
      )}
    </div>
  );
}

function HourStat({
  data,
  valueKey = "realized",
}) {
  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return <EmptyStat />;
  }

  /*
   * Otetaan mukaan vain heatmapissa
   * näytettävät aukiolotunnit.
   */
  const validRows = data
    .map((item) => ({
      ...item,
      hourLabel:
        getHourLabel(item),
      dateKey:
        getDateKey(item),
      numericValue:
        getValue(item, valueKey),
    }))
    .filter(
      (item) =>
        item.dateKey &&
        BUSINESS_HOURS.includes(
          item.hourLabel
        )
    );

  if (validRows.length === 0) {
    return <EmptyStat />;
  }

  /*
   * Kokonaismäärä valitulla jaksolla.
   */
  const total = validRows.reduce(
    (sum, item) =>
      sum + item.numericValue,
    0
  );

  /*
   * Päiväkohtaiset summat.
   */
  const totalsByDate = {};

  validRows.forEach((item) => {
    if (!totalsByDate[item.dateKey]) {
      totalsByDate[item.dateKey] = {
        total: 0,
        timestamp:
          getRowTimestamp(item),
      };
    }

    totalsByDate[item.dateKey].total +=
      item.numericValue;
  });

  const dateEntries =
    Object.entries(totalsByDate);

  const numberOfDays =
    dateEntries.length;

  const averagePerDay =
    numberOfDays > 0
      ? Math.round(
          total / numberOfDays
        )
      : 0;

  /*
   * Keskiarvo kaikista näkyvistä
   * päivä–tunti-yhdistelmistä.
   */
  const averagePerHour =
    validRows.length > 0
      ? Math.round(
          total / validRows.length
        )
      : 0;

  /*
   * Selvitetään keskimäärin kiireisin
   * kellonaika. Kukin tunti jaetaan niiden
   * päivien määrällä, joilta kyseiselle
   * tunnille löytyy dataa.
   */
  const totalsByHour = {};

  validRows.forEach((item) => {
    if (
      !totalsByHour[item.hourLabel]
    ) {
      totalsByHour[item.hourLabel] = {
        total: 0,
        count: 0,
      };
    }

    totalsByHour[
      item.hourLabel
    ].total += item.numericValue;

    totalsByHour[
      item.hourLabel
    ].count += 1;
  });

  const hourAverages =
    Object.entries(totalsByHour).map(
      ([hour, values]) => ({
        hour,
        average:
          values.count > 0
            ? values.total /
              values.count
            : 0,
      })
    );

  const busiestAverageHour =
    hourAverages.reduce(
      (busiest, current) =>
        !busiest ||
        current.average >
          busiest.average
          ? current
          : busiest,
      null
    );

  /*
   * Kiireisin yksittäinen tunti:
   * esimerkiksi torstai 08:00, 153 kpl.
   */
  const busiestSingleHour =
    validRows.reduce(
      (busiest, current) =>
        !busiest ||
        current.numericValue >
          busiest.numericValue
          ? current
          : busiest,
      null
    );

  /*
   * Kiireisin kokonainen päivä.
   */
  const busiestDayEntry =
    dateEntries.reduce(
      (busiest, current) =>
        !busiest ||
        current[1].total >
          busiest[1].total
          ? current
          : busiest,
      null
    );

  const busiestDay =
    busiestDayEntry
      ? {
          date:
            busiestDayEntry[0],
          total:
            busiestDayEntry[1]
              .total,
        }
      : null;

  return (
    <aside className="hour-stat-card">
      <h3>Tilastot</h3>

      <StatItem
        label={
          valueKey === "forecast"
            ? "Ennustettu yhteensä"
            : "Näytteenottoja yhteensä"
        }
        value={Math.round(total)}
        detail={`${numberOfDays} ${
          numberOfDays === 1
            ? "päivä"
            : "päivää"
        }`}
      />

      <StatItem
        label="Keskimäärin päivässä"
        value={averagePerDay}
      />

      <StatItem
        label="Keskimäärin tunnissa"
        value={averagePerHour}
      />

      <StatItem
        label="Keskimäärin kiireisin tunti"
        value={
          busiestAverageHour?.hour ||
          "–"
        }
        detail={
          busiestAverageHour
            ? `${Math.round(
                busiestAverageHour.average
              )} näytteenottoa`
            : null
        }
      />

      <StatItem
        label="Kiireisin yksittäinen tunti"
        value={
          busiestSingleHour
            ? busiestSingleHour.hourLabel
            : "–"
        }
        detail={
          busiestSingleHour
            ? `${formatDate(
                getRowTimestamp(
                  busiestSingleHour
                )
              )}, ${Math.round(
                busiestSingleHour.numericValue
              )} näytteenottoa`
            : null
        }
      />

      <StatItem
        label="Kiireisin päivä"
        value={
          busiestDay
            ? formatDate(
                busiestDay.date
              )
            : "–"
        }
        detail={
          busiestDay
            ? `${Math.round(
                busiestDay.total
              )} näytteenottoa`
            : null
        }
      />
    </aside>
  );
}

export default HourStat;