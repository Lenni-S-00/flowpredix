import { useEffect, useRef, useState } from "react";

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

// Palauttaa päivämäärän ilman kellonaikaa.
function startOfDay(value) {
  if (!value) return null;

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return date;
}

// Tarkistaa, ovatko päivämäärät sama päivä.
function isSameDate(firstDate, secondDate) {
  if (!firstDate || !secondDate) return false;

  return (
    startOfDay(firstDate).getTime() ===
    startOfDay(secondDate).getTime()
  );
}

// Muotoilee päivämäärän suomalaiseen muotoon.
function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return `${date.getDate()}.${
    date.getMonth() + 1
  }.${date.getFullYear()}`;
}

// Palauttaa valitun päivän viikon.
function getWeekRange(value) {
  const selectedDate = startOfDay(value);
  const weekdayIndex = (selectedDate.getDay() + 6) % 7;

  const monday = new Date(selectedDate);
  monday.setDate(selectedDate.getDate() - weekdayIndex);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: monday,
    endDate: sunday,
  };
}

// Luo kuukauden kalenteripäivät.
function createCalendarDays(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const emptyDaysBeforeMonth =
    (firstDayOfMonth.getDay() + 6) % 7;

  const calendarDays = [];

  for (
    let index = 0;
    index < emptyDaysBeforeMonth;
    index += 1
  ) {
    calendarDays.push(null);
  }

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push(new Date(year, month, day));
  }

  return calendarDays;
}

function Calendar({
  value,
  onChange,
  placeholder = "Valitse aikaväli",
  selectionMode = "range",
  disabled = false,
}) {
  const initialStartDate = value?.startDate
    ? startOfDay(value.startDate)
    : null;

  const initialEndDate = value?.endDate
    ? startOfDay(value.endDate)
    : null;

  const [currentDate, setCurrentDate] = useState(() => {
    const initialDate =
      initialStartDate || startOfDay(new Date());

    return new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    );
  });

  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] =
    useState(initialStartDate);
  const [endDate, setEndDate] =
    useState(initialEndDate);

  const [popupPosition, setPopupPosition] = useState({
    x: 0,
    y: 0,
  });

  const [isDragging, setIsDragging] = useState(false);

  const calendarRef = useRef(null);
  const dragStartRef = useRef({
    mouseX: 0,
    mouseY: 0,
    popupX: 0,
    popupY: 0,
  });

  // Päivittää sisäiset arvot ulkoisen arvon muuttuessa.
  useEffect(() => {
    const nextStartDate = value?.startDate
      ? startOfDay(value.startDate)
      : null;

    const nextEndDate = value?.endDate
      ? startOfDay(value.endDate)
      : null;

    setStartDate(nextStartDate);
    setEndDate(nextEndDate);

    if (nextStartDate) {
      setCurrentDate(
        new Date(
          nextStartDate.getFullYear(),
          nextStartDate.getMonth(),
          1
        )
      );
    }
  }, [value?.startDate, value?.endDate]);

  // Sulkee kalenterin ulkopuolisesta klikkauksesta.
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        setShowCalendar(false);
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

  // Liikuttaa kalenteria hiiren mukana raahauksen aikana.
  useEffect(() => {
    function handleMouseMove(event) {
      if (!isDragging) return;

      const xDifference =
        event.clientX - dragStartRef.current.mouseX;

      const yDifference =
        event.clientY - dragStartRef.current.mouseY;

      setPopupPosition({
        x: dragStartRef.current.popupX + xDifference,
        y: dragStartRef.current.popupY + yDifference,
      });
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    if (isDragging) {
      document.addEventListener(
        "mousemove",
        handleMouseMove
      );

      document.addEventListener(
        "mouseup",
        handleMouseUp
      );
    }

    return () => {
      document.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      document.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };
  }, [isDragging]);

  // Aloittaa kalenterin raahaamisen.
  function handleDragStart(event) {
    if (event.button !== 0) return;

    dragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      popupX: popupPosition.x,
      popupY: popupPosition.y,
    };

    setIsDragging(true);

    event.preventDefault();
  }

  // Avaa tai sulkee kalenterin.
  function toggleCalendar() {
    if (disabled) return;

    setShowCalendar((current) => {
      const nextValue = !current;

      if (nextValue) {
        setPopupPosition({
          x: 0,
          y: 0,
        });
      }

      return nextValue;
    });
  }

  // Siirtyy edelliseen kuukauteen.
  function showPreviousMonth() {
    setCurrentDate((current) => {
      return new Date(
        current.getFullYear(),
        current.getMonth() - 1,
        1
      );
    });
  }

  // Siirtyy seuraavaan kuukauteen.
  function showNextMonth() {
    setCurrentDate((current) => {
      return new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1
      );
    });
  }

  // Valitsee yhden päivän.
  function selectSingleDate(date) {
    const selectedDate = startOfDay(date);

    setStartDate(selectedDate);
    setEndDate(selectedDate);

    onChange?.({
      startDate: selectedDate,
      endDate: selectedDate,
    });

    setShowCalendar(false);
  }

  // Valitsee kokonaisen viikon.
  function selectWeek(date) {
    const weekRange = getWeekRange(date);

    setStartDate(weekRange.startDate);
    setEndDate(weekRange.endDate);

    onChange?.(weekRange);

    setShowCalendar(false);
  }

  // Aloittaa tai viimeistelee aikavälin valinnan.
  function selectDateRange(date) {
    const selectedDate = startOfDay(date);

    if (!startDate || endDate) {
      setStartDate(selectedDate);
      setEndDate(null);

      onChange?.({
        startDate: selectedDate,
        endDate: null,
      });

      return;
    }

    let nextStartDate = startDate;
    let nextEndDate = selectedDate;

    if (selectedDate < startDate) {
      nextStartDate = selectedDate;
      nextEndDate = startDate;
    }

    setStartDate(nextStartDate);
    setEndDate(nextEndDate);

    onChange?.({
      startDate: nextStartDate,
      endDate: nextEndDate,
    });

    setShowCalendar(false);
  }

  // Käsittelee päivän valinnan valintatilan mukaan.
  function handleDateClick(date) {
    if (!date) return;

    if (selectionMode === "single") {
      selectSingleDate(date);
      return;
    }

    if (selectionMode === "week") {
      selectWeek(date);
      return;
    }

    selectDateRange(date);
  }

  // Tarkistaa, kuuluuko päivä valittuun aikaväliin.
  function isInRange(date) {
    if (!date || !startDate || !endDate) {
      return false;
    }

    const current = startOfDay(date);
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);

    return current >= start && current <= end;
  }

  // Muodostaa kentässä näytettävän tekstin.
  function getSelectionText() {
    if (!startDate) {
      return placeholder;
    }

    if (selectionMode === "single") {
      return formatDate(startDate);
    }

    if (!endDate) {
      return `${formatDate(startDate)} –`;
    }

    return `${formatDate(startDate)} – ${formatDate(
      endDate
    )}`;
  }

  const calendarDays = createCalendarDays(currentDate);

  return (
    <div
      className="sidebar-date-picker"
      ref={calendarRef}
    >
      <button
        type="button"
        className={`sidebar-date-input ${
          showCalendar ? "is-open" : ""
        }`}
        disabled={disabled}
        onClick={toggleCalendar}
      >
        <span
          className={
            startDate
              ? "sidebar-date-value"
              : "sidebar-date-placeholder"
          }
        >
          {getSelectionText()}
        </span>

        <span
          className="sidebar-date-icon"
          aria-hidden="true"
        >
          📅
        </span>
      </button>

      {showCalendar && (
        <div
          className={`sidebar-calendar-popup ${
            isDragging ? "is-dragging" : ""
          }`}
          style={{
            transform: `translate(
              ${popupPosition.x}px,
              ${popupPosition.y}px
            )`,
          }}
        >
          <div
            className="sidebar-calendar-drag-handle"
            onMouseDown={handleDragStart}
            aria-label="Siirrä kalenteria"
          >
            <span className="sidebar-calendar-drag-icon">
              •••
            </span>
          </div>

          <div className="sidebar-calendar-header">
            <button
              type="button"
              aria-label="Edellinen kuukausi"
              onClick={showPreviousMonth}
            >
              ‹
            </button>

            <div className="sidebar-calendar-title">
              {MONTH_NAMES[currentDate.getMonth()]}{" "}
              {currentDate.getFullYear()}
            </div>

            <button
              type="button"
              aria-label="Seuraava kuukausi"
              onClick={showNextMonth}
            >
              ›
            </button>
          </div>

          <div className="sidebar-calendar-grid">
            <div>ma</div>
            <div>ti</div>
            <div>ke</div>
            <div>to</div>
            <div>pe</div>
            <div className="weekend">la</div>
            <div className="weekend">su</div>

            {calendarDays.map((date, index) => {
              const isSelected =
                date &&
                (isSameDate(date, startDate) ||
                  isSameDate(date, endDate));

              const isRangeDate =
                date &&
                selectionMode !== "single" &&
                isInRange(date);

              return (
                <button
                  type="button"
                  key={
                    date
                      ? date.toISOString()
                      : `empty-${index}`
                  }
                  className={[
                    "sidebar-calendar-day",
                    isSelected ? "selected" : "",
                    isRangeDate ? "in-range" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!date}
                  onClick={() => handleDateClick(date)}
                >
                  {date ? date.getDate() : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;