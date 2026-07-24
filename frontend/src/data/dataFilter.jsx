import { useEffect, useRef, useState } from "react";
import API from "../api";
import "./dataFilter.css";

const UNITS = [
  "Lab1",
  "Lab2",
  "Lab3",
  "Lab4",
  "Lab5",
  "Lab6",
  "Lab7",
  "Lab8",
  "Lab9",
  "Lab10",
  "Lab11",
  "Lab12",
  "Lab13",
  "Lab14",
  "Lab15",
  "Lab16",
  "Lab17",
  "Lab18",
  "Lab19",
  "Lab20",
  "Lab21",
];

const MONTH_NAMES = [
  "tammikuu",
  "helmikuu",
  "maaliskuu",
  "huhtikuu",
  "toukokuu",
  "kesäkuu",
  "heinäkuu",
  "elokuu",
  "syyskuu",
  "lokakuu",
  "marraskuu",
  "joulukuu",
];

// Muuntaa Date-olion YYYY-MM-DD-muotoon ilman UTC-aikavyöhykemuutosta.
function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Muuntaa YYYY-MM-DD-merkkijonon paikalliseksi Date-olioksi.
function parseDateKey(dateKey) {
  if (!dateKey) return null;

  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// Muotoilee päivämäärän suomalaisessa muodossa.
function formatDate(date) {
  if (!date) return "-";

  return [
    date.getDate(),
    date.getMonth() + 1,
    date.getFullYear(),
  ].join(".");
}

// Poimii päivämäärät API-vastauksesta.
function getAvailabilityDates(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData?.dates || [];
}

// Hakee toimipisteen datapäivät backendistä.
async function fetchAvailabilityDates(location) {
  const response = await API.get(
    "data/availability/",
    {
      params: {
        location,
      },
    }
  );

  return getAvailabilityDates(response.data);
}

// Palauttaa kalenterissa näytettävät päivät.
function createCalendarDays(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(
    year,
    month,
    1
  );

  // Muutetaan sunnuntai-alkuinen indeksi maanantai-alkuiseksi.
  const startDay =
    (firstDay.getDay() + 6) % 7;

  const days = [];

  for (let index = 0; index < startDay; index += 1) {
    days.push(null);
  }

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(
      new Date(year, month, day)
    );
  }

  return days;
}

function DataFilter() {
  const [selectedUnit, setSelectedUnit] =
    useState("Lab1");

  const [showUnitMenu, setShowUnitMenu] =
    useState(false);

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [dataDates, setDataDates] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const unitMenuRef = useRef(null);

  // Sulkee toimipistevalikon, kun käyttäjä klikkaa sen ulkopuolelle.
  useEffect(() => {
    function handleClickOutside(event) {
      const clickedOutside =
        unitMenuRef.current &&
        !unitMenuRef.current.contains(event.target);

      if (clickedOutside) {
        setShowUnitMenu(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // Hakee valitun toimipisteen toteutuneet datapäivät.
  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setIsLoading(true);
      setError("");

      try {
        const dates =
          await fetchAvailabilityDates(
            selectedUnit
          );

        if (cancelled) return;

        const uniqueSortedDates = [
          ...new Set(dates),
        ].sort();

        setDataDates(uniqueSortedDates);

        // Avataan automaattisesti kuukausi, jolla viimeisin data sijaitsee.
        if (uniqueSortedDates.length > 0) {
          const latestDate = parseDateKey(
            uniqueSortedDates[
              uniqueSortedDates.length - 1
            ]
          );

          if (latestDate) {
            setCurrentDate(
              new Date(
                latestDate.getFullYear(),
                latestDate.getMonth(),
                1
              )
            );
          }
        }
      } catch (fetchError) {
        if (cancelled) return;

        console.error(
          "Datapäivien haku epäonnistui:",
          fetchError.response?.data ||
            fetchError
        );

        setDataDates([]);
        setError(
          "Datapäivien haku epäonnistui."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [selectedUnit]);

  const dataDateSet = new Set(dataDates);

  const firstDataDate =
    dataDates.length > 0
      ? parseDateKey(dataDates[0])
      : null;

  const lastDataDate =
    dataDates.length > 0
      ? parseDateKey(
          dataDates[dataDates.length - 1]
        )
      : null;

  // Tarkistaa, löytyykö kyseiselle päivälle dataa.
  function hasData(date) {
    return dataDateSet.has(
      toDateKey(date)
    );
  }

  // Tarkistaa, kuuluuko päivä ensimmäisen ja viimeisen datapäivän väliin.
  // Tarkistaa, onko päivä nykyinen päivä tai menneisyydessä.
  function isTodayOrPast(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const comparedDate = new Date(date);
    comparedDate.setHours(0, 0, 0, 0);

    return comparedDate <= today;
  }

  // Merkitsee kaikki nykyhetkeen asti puuttuvat päivät data-aukoiksi.
  function isDataGap(date) {
    return (
      isTodayOrPast(date) &&
      !hasData(date)
    );
  }
  
  // Siirtyy edelliseen kuukauteen.
  function previousMonth() {
    setCurrentDate((previousDate) =>
      new Date(
        previousDate.getFullYear(),
        previousDate.getMonth() - 1,
        1
      )
    );
  }

  // Siirtyy seuraavaan kuukauteen.
  function nextMonth() {
    setCurrentDate((previousDate) =>
      new Date(
        previousDate.getFullYear(),
        previousDate.getMonth() + 1,
        1
      )
    );
  }

  const calendarDays =
    createCalendarDays(currentDate);

  return (
    <div className="data-filters">
      <div
        className="data-dropdown"
        ref={unitMenuRef}
      >
        <button
          type="button"
          className="data-trigger"
          onClick={() =>
            setShowUnitMenu(
              (previous) => !previous
            )
          }
        >
          <span className="data-trigger-text">
            {selectedUnit}
          </span>

          <span>📍</span>
        </button>

        {showUnitMenu && (
          <div className="data-list">
            <div className="data-actions">
              <span className="data-actions-title">
                Yksikkö
              </span>
            </div>

            {UNITS.map((unit) => (
              <button
                type="button"
                key={unit}
                className={`data-unit-item ${
                  selectedUnit === unit
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setSelectedUnit(unit);
                  setShowUnitMenu(false);
                }}
              >
                {unit}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="data-range-card">
        <span className="data-range-label">
          Dataa lisätty ajalle
        </span>

        {isLoading ? (
          <strong>Ladataan...</strong>
        ) : (
          <strong>
            {firstDataDate && lastDataDate
              ? `${formatDate(
                  firstDataDate
                )} – ${formatDate(
                  lastDataDate
                )}`
              : "Ei dataa"}
          </strong>
        )}

        {!isLoading && (
          <small>
            {dataDates.length} päivää dataa
          </small>
        )}

        {error && (
          <small className="data-filter-error">
            {error}
          </small>
        )}
      </div>

      <div className="data-calendar-card">
        <div className="data-calendar-header">
          <button
            type="button"
            onClick={previousMonth}
            aria-label="Edellinen kuukausi"
          >
            ‹
          </button>

          <div className="data-calendar-title">
            {MONTH_NAMES[
              currentDate.getMonth()
            ]}{" "}
            {currentDate.getFullYear()}
          </div>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Seuraava kuukausi"
          >
            ›
          </button>
        </div>

        <div className="data-calendar-grid">
          <div>ma</div>
          <div>ti</div>
          <div>ke</div>
          <div>to</div>
          <div>pe</div>
          <div className="weekend">la</div>
          <div className="weekend">su</div>

          {calendarDays.map(
            (date, index) => {
              const dayHasData =
                date && hasData(date);

              const dayIsGap =
                date && isDataGap(date);

              let title = "";

              if (date) {
                if (dayHasData) {
                  title = "Dataa lisätty";
                } else if (dayIsGap) {
                  title = "Aukko datassa";
                } else {
                  title = "Ei dataa";
                }
              }

              return (
                <button
                  type="button"
                  key={
                    date
                      ? toDateKey(date)
                      : `empty-${index}`
                  }
                  className={[
                    "data-calendar-day",
                    dayHasData
                      ? "has-data"
                      : "",
                    dayIsGap
                      ? "data-gap"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!date}
                  title={title}
                >
                  {date
                    ? date.getDate()
                    : ""}
                </button>
              );
            }
          )}
        </div>

        <div className="data-calendar-legend">
          <span>
            <i className="legend-dot has-data" />
            Dataa
          </span>

          <span>
            <i className="legend-dot data-gap" />
            Aukko
          </span>
        </div>
      </div>
    </div>
  );
}

export default DataFilter;