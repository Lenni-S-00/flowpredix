import { useEffect, useRef, useState } from "react";

function Calendar({
  value,
  onChange,
  placeholder = "Valitse aikaväli",
  selectionMode = "range",
}) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(value?.startDate || null);
  const [endDate, setEndDate] = useState(value?.endDate || null);

  const calendarRef = useRef(null);
  const closeTimerRef = useRef(null);

  const monthNames = [
    "tammikuu", "helmikuu", "maaliskuu", "huhtikuu",
    "toukokuu", "kesäkuu", "heinäkuu", "elokuu",
    "syyskuu", "lokakuu", "marraskuu", "joulukuu"
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };
    const getWeekRange = (date) => {
    const selectedDate = new Date(date);
    const day = (selectedDate.getDay() + 6) % 7;

    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - day);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        startDate: monday,
        endDate: sunday,
    };
    };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };


const handleDateClick = (date) => {
  clearTimeout(closeTimerRef.current);

  if (selectionMode === "week") {
    const weekRange = getWeekRange(date);

    setStartDate(weekRange.startDate);
    setEndDate(weekRange.endDate);
    onChange?.(weekRange);

    closeTimerRef.current = setTimeout(() => {
      setShowCalendar(false);
    }, 500);

    return;
  }

  if (!startDate || endDate) {
    setStartDate(date);
    setEndDate(null);
    onChange?.({ startDate: date, endDate: null });
    return;
  }

  let newStartDate = startDate;
  let newEndDate = date;

  if (date < startDate) {
    newStartDate = date;
    newEndDate = startDate;
  }

  setStartDate(newStartDate);
  setEndDate(newEndDate);
  onChange?.({ startDate: newStartDate, endDate: newEndDate });

  closeTimerRef.current = setTimeout(() => {
    setShowCalendar(false);
  }, 700);
};

  const isSameDate = (a, b) => {
    if (!a || !b) return false;
    return a.toDateString() === b.toDateString();
  };

  const isInRange = (date) => {
    if (!startDate || !endDate) return false;
    return date > startDate && date < endDate;
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7;

    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDate = (date) => {
    if (!date) return "";
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  const rangeText =
    startDate && endDate
      ? `${formatDate(startDate)} – ${formatDate(endDate)}`
      : startDate
      ? `${formatDate(startDate)} –`
      : placeholder;

  return (
    <div className="sidebar-date-picker" ref={calendarRef}>
      <button
        type="button"
        className="sidebar-date-input"
        onClick={() => setShowCalendar((prev) => !prev)}
      >
        <span>{rangeText}</span>
        <span>📅</span>
      </button>

      {showCalendar && (
        <div className="sidebar-calendar-popup">
          <div className="sidebar-calendar-header">
            <button type="button" onClick={previousMonth}>
              ‹
            </button>

            <div className="sidebar-calendar-title">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>

            <button type="button" onClick={nextMonth}>
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

            {getCalendarDays().map((date, index) => (
              <button
                type="button"
                key={index}
                className={`
                  sidebar-calendar-day
                  ${date && isSameDate(date, startDate) ? "selected" : ""}
                  ${date && isSameDate(date, endDate) ? "selected" : ""}
                  ${date && isInRange(date) ? "in-range" : ""}
                `}
                disabled={!date}
                onClick={() => handleDateClick(date)}
              >
                {date ? date.getDate() : ""}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;